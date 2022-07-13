import { pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { First } from 'hkt-ts/Typeclass/Associative'
import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Atomic } from '@/Atomic/Atomic'
import { Env } from '@/Env/Env'
import * as Exit from '@/Exit/Exit'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { FiberScope } from '@/FiberScope/index'
import { FiberStatus } from '@/FiberStatus/FiberStatus'
import { Access } from '@/Fx/InstructionSet/Access'
import { Async } from '@/Fx/InstructionSet/Async'
import { Fork } from '@/Fx/InstructionSet/Fork'
import { fromExit, FromExit, unit } from '@/Fx/InstructionSet/FromExit'
import { LazyFx, fromLazy } from '@/Fx/InstructionSet/FromLazy'
import { GetFiberScope } from '@/Fx/InstructionSet/GetFiberScope'
import { Join } from '@/Fx/InstructionSet/Join'
import {
  AnyFx,
  AnyInstruction,
  Fx,
  Instruction,
  Of,
  Provide,
  SetInterruptible,
  WithConcurrency,
} from '@/Fx/index'
import { Closeable, Finalizer } from '@/Scope/index'
import { Stack } from '@/Stack/index'
import * as Supervisor from '@/Supervisor/index'
import { NonNegativeInteger } from 'hkt-ts/number'
import { Platform } from '@/Platform/Platform'
import { Just, Maybe } from 'hkt-ts/Maybe'
import { fromFiberRuntime } from './fromFiberRuntime'
import { Scheduler } from '@/Scheduler/Scheduler'

export interface FiberRuntimeParams<R, E, A> {
  readonly fiberId: FiberId
  readonly fx: Fx<R, E, A>
  readonly environment: Env<R>
  readonly scheduler: Scheduler
  readonly supervisor: Supervisor.Supervisor
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly platform: Platform
  readonly parent: Maybe<FiberRuntime<any, any, any>>
}

// Track Children/Parent
// Supervisor
// Logging
// Metrics
// Tracing
// Layers
// Streams
export class FiberRuntime<R, E, A> {
  get status(): FiberStatus<E, A> {
    return this.fiberStatus.get
  }

  /**
   * The Scope for this Fiber
   */
  readonly scope: FiberScope = new FiberScope(
    this.params.fiberId,
    this.params.scope,
    this.params.fiberRefs,
  )

  /**
   * The Current FiberRuntimeNode to process
   */
  protected current: FiberRuntimeNode | undefined
  // Stacks
  protected environment: Stack<Env<any>> = new Stack(this.params.environment)
  protected interruptStatus: Stack<boolean> = new Stack(true)
  protected concurrencyLevel: Stack<NonNegativeInteger> = new Stack(
    this.params.platform.maxConcurrency,
  )
  protected instructionCount: number = 0
  protected exiting: boolean = false
  protected exited: boolean = false

  /**
   * The Current Status of this FiberRuntime
   */
  protected fiberStatus = new Atomic<FiberStatus<E, A>>(
    new FiberStatus.Suspended(this.params.fiberId, new Set()),
    Strict,
  )

  constructor(readonly params: FiberRuntimeParams<R, E, A>) {
    this.current = new RuntimeInitialNode(params.fx)
  }

  readonly addObserver = (observer: FiberStatus.Observer<E, A>): Of<Finalizer> => {
    const status = pipe(this.fiberStatus.get, FiberStatus.addObserver(observer))

    switch (status.tag) {
      case FiberStatus.Exited.tag:
        return fromLazy(() => {
          observer(status.exit)

          return () => unit
        })
      default:
        return fromLazy(() => {
          this.fiberStatus.set(status)

          return () =>
            fromLazy(() =>
              pipe(
                this.fiberStatus.get,
                FiberStatus.removeObserver(observer),
                this.fiberStatus.set,
              ),
            )
        })
    }
  }

  readonly start = () => {
    this.running()

    while (this.current && !this.exited) {
      this.processNode(this.current)
    }

    this.suspended()
  }

  /**
   * Steps over the current RuntimeNode to determine what to do next
   */
  protected processNode(node: FiberRuntimeNode) {
    try {
      switch (node.tag) {
        case 'Generator':
          return this.processGenerator(node)
        case 'Instruction':
          return this.processInstruction(node)
        case 'Initial':
          return this.processInitial(node)
        case 'Exit':
          return this.processExitNode(node)
      }
    } catch (e) {
      if (this.exiting) {
        throw e
      }

      this.current = new RuntimeExitNode(Exit.die(e))
    }
  }

  /**
   * Steps over the Fx-based Generator, passing failures up along the Generator Stack to allow for
   * try/catch handlers to continue working as expected.
   */
  protected processGenerator(node: RuntimeGeneratorNode) {
    try {
      this.processIteratorResult(node, node.iterate())
    } catch (e) {
      // Our finalizers criticall failed, nothing else to do but notify any observers.
      if (!node.previous || node.previous.tag === 'Exit') {
        this.current = undefined

        return this.finalized(
          node.previous
            ? Exit.makeParallelAssociative<any, any>(First).concat(node.previous.exit, Exit.die(e))
            : Exit.die(e),
        )
      }

      // Critical Failure, Allow the program to Finalize
      if (node.previous.tag === 'Initial') {
        return (this.current = new RuntimeExitNode(Exit.die(e)))
      }

      // Unwind the generator stack to allow for any try/catch handlers to run
      node.previous.method.set('throw')
      node.previous.next.set(e)

      this.current = node.previous
    }
  }

  /**
   * Handle a successful IteratorResult from Fx-based Generator
   */
  protected processIteratorResult(
    node: RuntimeGeneratorNode,
    result: IteratorResult<AnyInstruction, any>,
  ) {
    // Continue processing instructions
    if (!result.done) {
      return (this.current = new RuntimeInstructionNode(result.value, node))
    }

    // We're just running a one-off instruction that should otherwise suspend the Fiber
    if (!node.previous) {
      return (this.current = undefined)
    }

    // We've already finalized the Scope, lets just end here
    if (node.previous.tag === 'Exit') {
      return this.finalized(node.previous.exit)
    }

    // We've completed this Fx, now lets close the Scope
    if (node.previous.tag === 'Initial') {
      return (this.current = new RuntimeExitNode(Exit.success(result.value)))
    }

    // Continue processing the generators
    node.previous.next.set(result.value)
    this.current = node.previous
  }

  /**
   * Processes each of the instructions
   */
  protected processInstruction(node: RuntimeInstructionNode) {
    const that = this
    const instr = node.instruction
    const prev = node.previous

    // Don't let any synchronous workflows hog up the entire thread
    if (this.instructionCount++ > this.params.platform.maxInstructionCount) {
      this.instructionCount = 0
      return this.yieldNow()
    }

    if (instr.is(Access)) {
      return (this.current = new RuntimeGeneratorNode(
        toGen(instr.input(this.environment.value)),
        prev,
      ))
    }

    if (instr.is(Async)) {
      const { scope } = this
      const [finalizer, addFinalizer] = Finalizer.settable()

      this.current = pipe(
        instr.input.register((fx) => {
          this.current = new RuntimeGeneratorNode(
            toGen(
              Fx(function* () {
                const x = yield* fx

                yield* finalizer(Either.Right(x))

                return x
              }),
            ),
            prev,
          )
          this.start()
        }),
        Either.match(
          // Register
          (fx) =>
            new RuntimeGeneratorNode(
              toGen(
                Fx(function* () {
                  addFinalizer(yield* scope.ensuring(fx as Of<any>))
                }),
              ),
              undefined,
            ),
          // Resume Immediately
          (fx) => new RuntimeGeneratorNode(toGen(fx), prev),
        ),
      )

      return
    }

    if (instr.is(Fork)) {
      const [fx, params] = instr.input

      return this.current = new RuntimeGeneratorNode(toGen(Fx(function* () {
        const fiberId = FiberId(that.params.platform.sequenceNumber.increment, that.params.scheduler.currentTime())
        const runtime = new FiberRuntime({
          fiberId,
          fx,
          environment: that.environment.value,
          scheduler: that.params.scheduler,
          supervisor: Supervisor.None,
          fiberRefs: params.fiberRefs ?? (yield* that.scope.fiberRefs.fork),
          scope: params.scope ?? (yield* that.scope.fork),
          platform: that.params.platform,
          parent: Just(that),
          ...params,
        })

        return fromFiberRuntime(runtime)
      })), prev)
    }

    if (instr.is(FromExit)) {
      return (this.current = pipe(
        instr.input as Exit.Exit<any, any>,
        Either.match(
          (cause) => new RuntimeExitNode(Either.Left(cause)),
          (a) => {
            prev.next.set(a)
            return prev
          },
        ),
      ))
    }

    if (instr.is(LazyFx)) {
      return (this.current = new RuntimeGeneratorNode(toGen(instr.input()), prev))
    }

    if (instr.is(GetFiberScope)) {
      prev.next.set(this.scope)

      return (this.current = prev)
    }

    if (instr.is(Join)) {
      this.current = new RuntimeGeneratorNode(
        toGen(
          Fx(function* () {
            const exit = yield* instr.input.exit

            yield* instr.input.inheritFiberRefs

            return yield* fromExit(exit)
          }),
        ),
        prev,
      )
    }

    if (instr.is(Provide)) {
      const [fx, env] = instr.input

      return (this.current = new RuntimeGeneratorNode(
        toGen(
          Fx(function* () {
            that.environment = that.environment.push(env) // Add current Env to the

            const x = yield* fx

            that.environment = that.environment.pop() || that.environment

            return x
          }),
        ),
        prev,
      ))
    }

    if (instr.is(SetInterruptible)) {
      const [fx, interruptable] = instr.input

      return (this.current = new RuntimeGeneratorNode(
        toGen(
          Fx(function* () {
            that.interruptStatus = that.interruptStatus.push(interruptable)

            const x = yield* fx

            that.interruptStatus = that.interruptStatus.pop() || that.interruptStatus

            return x
          }),
        ),
        prev,
      ))
    }

    if (instr.is(WithConcurrency)) {
      // TODO
    }

    throw new Error(`Unknown Instruction ecountered: ${JSON.stringify(instr)}`)
  }

  /**
   * Turn our Fx into a Generator for iteration
   */
  protected processInitial(node: RuntimeInitialNode) {
    this.current = new RuntimeGeneratorNode(toGen(node.fx), node)

    if (this.params.supervisor !== Supervisor.None) {
      this.params.supervisor.onStart(this, node.fx, this.params.parent)
    }
  }

  /**
   * Start closing our Scope.
   */
  protected processExitNode(node: RuntimeExitNode) {
    this.exiting = true
    this.current = new RuntimeGeneratorNode(toGen(this.scope.close(node.exit)), node)
  }

  /**
   * If Suspended, update the status to Running
   */
  protected running() {
    this.fiberStatus.update((s) => (s.tag === 'Suspended' ? s.running() : s))
  }

  /**
   * If Running, update the status to Suspended
   */
  protected suspended() {
    this.fiberStatus.update((s) => (s.tag === 'Running' ? s.suspended() : s))
  }

  /**
   * The Fiber has completely finished
   */
  protected finalized(exit: Exit.Exit<E, A>) {
    this.exited = true
    const currentStatus = this.fiberStatus.getAndSet(
      new FiberStatus.Exited(this.params.fiberId, exit),
    )

    if (currentStatus.tag !== 'Exited') {
      currentStatus.observers.forEach((o) => o(exit))
    }
  }

  protected yieldNow() {
    const current = this.current
    this.current = undefined

    Promise.resolve().then(() => {
      this.current = current
      this.start()
    })
  }
}

export type FiberRuntimeNode =
  | RuntimeInitialNode
  | RuntimeGeneratorNode
  | RuntimeInstructionNode
  | RuntimeExitNode

export class RuntimeInitialNode {
  readonly tag = 'Initial'

  constructor(readonly fx: AnyFx) {}
}

export class RuntimeGeneratorNode {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<AnyInstruction, any>,
    readonly previous: RuntimeInitialNode | RuntimeExitNode | RuntimeGeneratorNode | undefined,
    readonly next: Atomic<any> = new Atomic(undefined, Strict),
    readonly method = new Atomic<'next' | 'throw'>('next', Strict),
  ) {}

  iterate() {
    return this.generator[this.method.getAndSet('next')](this.next.get)
  }
}

export class RuntimeInstructionNode {
  readonly tag = 'Instruction'

  constructor(readonly instruction: AnyInstruction, readonly previous: RuntimeGeneratorNode) {}
}

export class RuntimeExitNode {
  readonly tag = 'Exit'

  constructor(readonly exit: Exit.Exit<any, any>) {}
}

function toGen<R, E, A>(fx: Fx<R, E, A>): Generator<Instruction<R, E, any>, A> {
  return fx[Symbol.iterator]() as Generator<Instruction<R, E, any>, A>
}
