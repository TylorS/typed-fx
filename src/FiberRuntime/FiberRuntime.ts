import { pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'
import { Strict } from 'hkt-ts/Typeclass/Eq'
import { NonNegativeInteger } from 'hkt-ts/number'

import { fromFiberRuntime } from './fromFiberRuntime'

import { Atomic } from '@/Atomic/Atomic'
import { Env } from '@/Env/Env'
import * as Exit from '@/Exit/Exit'
import { Fiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { FiberScope } from '@/FiberScope/index'
import { FiberStatus } from '@/FiberStatus/FiberStatus'
import { Future, pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { Access } from '@/Fx/InstructionSet/Access'
import { Async } from '@/Fx/InstructionSet/Async'
import { Fork } from '@/Fx/InstructionSet/Fork'
import { FromExit, fromExit, success, unit } from '@/Fx/InstructionSet/FromExit'
import { LazyFx, fromLazy } from '@/Fx/InstructionSet/FromLazy'
import { GetFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { Join } from '@/Fx/InstructionSet/Join'
import { ZipAll } from '@/Fx/InstructionSet/ZipAll'
import {
  AnyFx,
  AnyInstruction,
  ForkParams,
  Fx,
  Instruction,
  Of,
  Provide,
  SetInterruptible,
  WithConcurrency,
} from '@/Fx/index'
import { Platform } from '@/Platform/Platform'
import { Scheduler } from '@/Scheduler/Scheduler'
import { Finalizer } from '@/Scope/Finalizer'
import type { Closeable } from '@/Scope/Scope'
import { settable } from '@/Scope/settable'
import { Semaphore, acquire } from '@/Semaphore/Semaphore'
import { Stack } from '@/Stack/index'
import { StackTrace, captureTrace } from '@/StackTrace/StackTrace'
import * as Supervisor from '@/Supervisor/index'
import { EmptyTrace, StackFrameTrace, Trace } from '@/Trace/Trace'

export interface FiberRuntimeParams<R, E, A> {
  readonly fiberId: FiberId
  readonly fx: Fx<R, E, A>
  readonly env: Env<R>
  readonly scheduler: Scheduler
  readonly supervisor: Supervisor.Supervisor
  readonly fiberRefs: FiberRefs
  readonly scope: Closeable
  readonly platform: Platform
  readonly parent: Maybe<FiberContext>
}

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat
const concatExitPar = Exit.makeParallelAssociative<any, any>(First).concat

// Logging
// Metrics
// Tracing
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
   * All of the running Fibers
   */
  get children(): ReadonlySet<Fiber<any, any>> {
    return new Set(this._children.values())
  }

  readonly stackTrace = fromLazy(() => this._stackTrace)
  readonly exit: Future<never, never, Exit.Exit<E, A>> = pending()

  // State
  protected currentNode: FiberRuntimeNode | undefined
  protected _environment: Stack<Env<any>> = new Stack(this.params.env)
  protected _interruptStatus: Stack<boolean> = new Stack(true)
  protected _concurrencyLevel: Stack<Semaphore> = new Stack(
    new Semaphore(this.params.platform.maxConcurrency),
  )
  protected _instructionCount = 0
  protected _exiting = false
  protected _interruptedBy: Array<FiberId> = []
  protected _stackTrace = new StackTrace(this.scope.fiberId, new Stack<Trace>(EmptyTrace))
  protected _children = new Map<FiberId, Fiber<any, any>>()

  /**
   * The Current Status of this FiberRuntime
   */
  protected fiberStatus: Atomic<FiberStatus<E, A>>

  constructor(readonly params: FiberRuntimeParams<R, E, A>) {
    this.currentNode = new RuntimeInitialNode(params.fx)
    this.fiberStatus = new Atomic<FiberStatus<E, A>>(
      new FiberStatus.Suspended(this.params.fiberId, new Set()),
      Strict,
    )
  }

  readonly addObserver = (observer: FiberStatus.Observer<E, A>): Finalizer => {
    const status = this.fiberStatus.update(FiberStatus.addObserver(observer))

    switch (status.tag) {
      case FiberStatus.Exited.tag:
        observer(status.exit)

        return () => unit
      default:
        this.fiberStatus.set(status)

        return () => fromLazy(() => this.fiberStatus.update(FiberStatus.removeObserver(observer)))
    }
  }

  readonly start = () => {
    this.running()

    while (this.currentNode && this.exit.state.get.tag === 'Pending') {
      this.processNode(this.currentNode)
    }

    this.suspended()
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  readonly startLater = (targetObject?: Function) => {
    this.yieldNow(targetObject)
  }

  readonly interrupt = (fiberId: FiberId) => {
    this._interruptedBy.push(fiberId)

    if (this._interruptStatus.value) {
      this.finalized(Exit.interrupt(fiberId))
    }

    return wait(this.exit)
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
          return this.pushInstruction(node)
        case 'Initial':
          return this.processInitial(node)
        case 'Exit':
          return this.processExitNode(node)
        case 'InterruptStatus':
          return this.pushInterruptStatus(node)
        case 'ConcurrencyLevel':
          return this.pushConcurrencyLevel(node)
      }
    } catch (e) {
      if (this._exiting) {
        throw e
      }

      this.currentNode = new RuntimeExitNode(Exit.die(e), node)
    }
  }

  /**
   * Steps over the Fx-based Generator, passing failures up along the Generator Stack to allow for
   * try/catch handlers to continue working as expected.
   */
  protected processGenerator(node: RuntimeGeneratorNode) {
    try {
      return this.processIteratorResult(node, node.iterate())
    } catch (e) {
      // Our finalizers critically failed, nothing else to do but notify any observers.
      if (!node.previous || node.previous.tag === 'Exit') {
        return this.finalized(
          node.previous ? concatExitSeq(node.previous.exit, Exit.die(e)) : Exit.die(e),
        )
      }

      // Critical Failure, Allow the program to Finalize
      if (node.previous.tag === 'Instruction') {
        return this.popPrevious(node.previous.previous, e, true)
      }

      // Critical Failure, Allow the program to Finalize
      if (node.previous.tag === 'Initial') {
        return (this.currentNode = new RuntimeExitNode(Exit.die(e), node))
      }

      // If we've reached an InterruptStatusNode we know to pop off a status
      if (node.previous.tag === 'InterruptStatus') {
        return this.popInterruptStatus(node.previous, e, true)
      }

      if (node.previous.tag === 'ConcurrencyLevel') {
        return this.popConcurrencyLevel(node.previous, e, true)
      }

      // Unwind the generator stack to allow for any try/catch handlers to run
      return this.popPrevious(node.previous, e, true)
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
      return (this.currentNode = new RuntimeInstructionNode(result.value, node))
    }

    const prev = node.previous

    // We're just running a one-off instruction that should otherwise suspend the Fiber
    if (!prev) {
      return (this.currentNode = undefined)
    }

    if (prev.tag === 'Instruction') {
      return this.popPrevious(prev.previous, result.value, false)
    }

    if (prev.tag === 'Generator') {
      return this.popPrevious(prev, result.value, false)
    }

    // We've completed this Fx, now lets close the Scope
    if (prev.tag === 'Initial') {
      return (this.currentNode = new RuntimeExitNode(Exit.success(result.value), node))
    }

    if (prev.tag === 'InterruptStatus') {
      return this.popInterruptStatus(prev, result.value, false)
    }

    if (prev.tag === 'ConcurrencyLevel') {
      return this.popConcurrencyLevel(prev, result.value, false)
    }

    // We've already finalized the Scope, lets just end here
    return this.finalized(prev.exit)
  }

  /**
   * Processes each of the instructions
   */
  protected pushInstruction(node: RuntimeInstructionNode) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    const instr = node.instruction

    // Don't let any synchronous workflows hog up the entire thread
    if (this._instructionCount++ > this.params.platform.maxInstructionCount) {
      this._instructionCount = 0
      return this.yieldNow()
    }

    this.withSuperisor((s) => s.onInstruction(this, instr as Instruction<any, any, any>))

    // Add a Trace when it is available
    // TODO: Improve parsing of the trace
    if (instr.trace) {
      const [file, method, line, column] = instr.trace.split(/:/g)

      this.pushTrace(
        new StackFrameTrace([
          {
            file,
            method,
            line: parseFloat(line),
            column: parseFloat(column),
          },
        ]),
      )
    }

    // Access the environment
    if (instr.is(Access)) {
      return (this.currentNode = new RuntimeGeneratorNode(
        toGen(instr.input(this._environment.value)),
        node,
      ))
    }

    // Provide the Environment
    if (instr.is(Provide)) {
      const [fx, env] = instr.input

      return (this.currentNode = new RuntimeGeneratorNode(
        (function* () {
          that._environment = that._environment.push(env) // Add current Env to the

          const x = yield* fx

          that._environment = that._environment.pop() || that._environment

          return x
        })() as Generator<AnyInstruction, any>,
        node,
      ))
    }

    // Access FiberContext
    if (instr.is(GetFiberContext)) {
      return this.popPrevious(node.previous, this.getFiberContext(), false)
    }

    // Run Sync Effects
    if (instr.is(FromExit)) {
      return pipe(
        instr.input as Exit.Exit<any, any>,
        Either.match(
          (cause) => (this.currentNode = new RuntimeExitNode(Either.Left(cause), node)),
          (a) => this.popPrevious(node.previous, a, false),
        ),
      )
    }

    // Run Async Effects
    if (instr.is(Async)) {
      const { scope } = this
      const [finalizer, addFinalizer] = settable()

      // Keep track of race condition between callback is called synchronously.
      let addedFinalizer = false // Track if the finalizer has been registered already
      let needsStart: (() => void) | null = null // Track if the next node needs to be added to the stack

      this.currentNode = pipe(
        instr.input((fx) => {
          const next = new RuntimeGeneratorNode(
            (function* () {
              const x = yield* fx

              yield* finalizer(Either.Right(x))

              return x
            })() as Generator<AnyInstruction, void>,
            node,
          )

          const start = () => {
            this.currentNode = next
            this.start()
          }

          if (addedFinalizer) {
            start()
          } else {
            needsStart = start
          }
        }),
        Either.match(
          // Register
          (fx) =>
            new RuntimeGeneratorNode(
              (function* () {
                addFinalizer(yield* scope.ensuring(fx as Of<any>))
                addedFinalizer = true

                if (needsStart) {
                  needsStart()
                }
              })() as Generator<AnyInstruction, void>,
              undefined,
            ),
          // Resume Immediately
          (fx) => new RuntimeGeneratorNode(toGen(fx), node),
        ),
      )

      return
    }

    if (instr.is(ZipAll)) {
      const fx = instr.input
      this.currentNode = new RuntimeGeneratorNode(
        (function* () {
          if (fx.length === 0) {
            return []
          }

          const [future, onExit] = zipAllFuture(fx.length)
          const runtimes: Array<FiberRuntime<any, any, any>> = Array(fx.length)

          for (let i = 0; i < fx.length; ++i) {
            const runtime = (runtimes[i] = yield* that.forkRuntime(fx[i], {}, (exit) =>
              onExit(exit, i),
            ))

            // Track Child relationship while the Scope is open
            that._children.set(runtime.scope.fiberId, fromFiberRuntime(runtime))
          }

          // Start all the Fibers
          runtimes.forEach((r) => r.start())

          return yield* fromExit(yield* wait(future))
        })() as Generator<AnyInstruction, any>,
        node,
      )

      return
    }

    // Fork a separate process from the current
    if (instr.is(Fork)) {
      const [fx, params] = instr.input

      return (this.currentNode = new RuntimeGeneratorNode(
        (function* () {
          const runtime = yield* that.forkRuntime(fx, params)
          const fiber = fromFiberRuntime(runtime)

          // Track Child relationship while the Scope is open
          that._children.set(runtime.scope.fiberId, fiber)

          runtime.startLater()

          return fiber
        })() as Generator<AnyInstruction, any>,
        node,
      ))
    }

    // Join a process into the current
    if (instr.is(Join)) {
      this.currentNode = new RuntimeGeneratorNode(
        (function* () {
          const fiber = instr.input

          // Remove Child as it is being merged into the Parent
          that._children.delete(fiber.id)

          const exit = yield* fiber.exit

          yield* fiber.inheritFiberRefs

          return yield* fromExit(exit)
        })() as Generator<AnyInstruction, any>,
        node,
      )
    }

    // Lazily-defined Fx
    if (instr.is(LazyFx)) {
      return (this.currentNode = new RuntimeGeneratorNode(toGen(instr.input()), node))
    }

    // Change InterruptStatus
    if (instr.is(SetInterruptible)) {
      const [fx, interruptible] = instr.input

      return (this.currentNode = new InterruptStatusNode(fx, interruptible, node))
    }

    // Change Concurrency Level
    if (instr.is(WithConcurrency)) {
      const [fx, level] = instr.input

      return (this.currentNode = new ConcurrencyLevelNode(fx, level, node))
    }

    throw new Error(`Unknown Instruction ecountered: ${JSON.stringify(instr)}`)
  }

  /**
   * Turn our Fx into a Generator for iteration
   */
  protected processInitial(node: RuntimeInitialNode) {
    this.currentNode = new RuntimeGeneratorNode(toGen(node.fx), node)
    this.withSuperisor((s) => s.onStart(this, node.fx as any, this.params.parent))
  }

  /**
   * Start closing our Scope.
   */
  protected processExitNode(node: RuntimeExitNode) {
    this._exiting = true
    this.currentNode = new RuntimeGeneratorNode(toGen(this.scope.close(node.exit)), node)
  }

  protected pushInterruptStatus(node: InterruptStatusNode) {
    this._interruptStatus = this._interruptStatus.push(node.interruptStatus)
    this.currentNode = new RuntimeGeneratorNode(toGen(node.fx), node)
  }

  protected popInterruptStatus(node: InterruptStatusNode, value: any, error: boolean) {
    this._interruptStatus = this._interruptStatus.pop() || this._interruptStatus

    // If we are interrupting, and we can interrupt now lets finalize things now.
    if (this._interruptedBy.length > 0 && this._interruptStatus.value) {
      this.currentNode = new RuntimeExitNode(Exit.interrupt(this._interruptedBy[0]), node.previous)
    } else {
      this.popPrevious(
        node.previous.tag === 'Generator' ? node.previous : node.previous.previous,
        value,
        error,
      )
    }
  }

  protected pushConcurrencyLevel(node: ConcurrencyLevelNode) {
    this._concurrencyLevel = this._concurrencyLevel.push(new Semaphore(node.concurrencyLevel))
    this.currentNode = new RuntimeGeneratorNode(toGen(node.fx), node)
  }

  protected popConcurrencyLevel(node: ConcurrencyLevelNode, value: any, error: boolean) {
    this._concurrencyLevel = this._concurrencyLevel.pop() || this._concurrencyLevel
    this.popPrevious(
      node.previous.tag === 'Generator' ? node.previous : node.previous.previous,
      value,
      error,
    )
  }

  protected popPrevious(node: RuntimeGeneratorNode, value: any, error: boolean) {
    if (error) {
      node.method.set('throw')
    }

    node.next.set(value)
    this.currentNode = node
  }

  /**
   * If Suspended, update the status to Running
   */
  protected running() {
    const current = this.fiberStatus.get

    console.log(this.fiberStatus)

    if (current.tag === 'Suspended') {
      this.fiberStatus.set(current.running())
      this.withSuperisor((s) => s.onRunning(this))
    }
  }

  /**
   * If Running, update the status to Suspended
   */
  protected suspended() {
    const current = this.fiberStatus.get

    if (current.tag === 'Running') {
      this.fiberStatus.set(current.suspended())
      this.withSuperisor((s) => s.onSuspend(this))
    }
  }

  /**
   * The Fiber has completely finished
   */
  protected finalized(exit: Exit.Exit<E, A>) {
    this.currentNode = undefined
    const currentStatus = this.fiberStatus.getAndSet(
      new FiberStatus.Exited(this.params.fiberId, exit),
    )

    if (currentStatus.tag !== 'Exited') {
      currentStatus.observers.forEach((o) => o(exit))
      this.withSuperisor((s) => s.onEnd(this, exit))
      complete(success(exit))(this.exit)
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  protected yieldNow(targetObject?: Function) {
    const current = this.currentNode
    this.currentNode = undefined

    // Capture the Stack before yielding asynchronously
    this.pushTrace(captureTrace(undefined, targetObject))

    Promise.resolve().then(() => {
      this.currentNode = current
      this.start()
    })
  }

  protected pushTrace = (trace: Trace) => (this._stackTrace = this._stackTrace.push(trace))
  protected popTrace = () => (this._stackTrace = this._stackTrace.pop())

  protected withSuperisor = <B>(f: (s: Supervisor.Supervisor) => B) => {
    if (this.params.supervisor === Supervisor.None) {
      return Nothing
    }

    return Just(f(this.params.supervisor))
  }

  protected getFiberContext = (): FiberContext =>
    new FiberContext(
      this.scope,
      this.status,
      this._stackTrace,
      this.params.scheduler,
      this.params.supervisor,
      this.params.platform,
      this.params.parent,
      this.children,
    )

  protected forkRuntime = (
    fx: AnyFx,
    params: ForkParams<any>,
    onExit?: (exit: Exit.Exit<any, any>) => void,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Fx(function* () {
      const fiberId = FiberId(
        that.params.platform.sequenceNumber.increment,
        that.params.scheduler.currentTime(),
      )

      const runtime = new FiberRuntime({
        fiberId,
        fx: acquire(that._concurrencyLevel.value)(fx),
        env: that._environment.value,
        scheduler: that.params.scheduler,
        supervisor: Supervisor.None,
        fiberRefs: params.fiberRefs ?? (yield* that.scope.fiberRefs.fork),
        scope: params.scope ?? (yield* that.scope.fork),
        platform: that.params.platform,
        parent: Just(that.getFiberContext()),
        ...params,
      })

      // Remove Child relationship when the Scope closes
      yield* runtime.scope.addFinalizer((exit) =>
        fromLazy(() => {
          that._children.delete(fiberId)
          onExit?.(exit)
        }),
      )

      return runtime
    })
  }
}

export type FiberRuntimeNode =
  | RuntimeInitialNode
  | RuntimeGeneratorNode
  | RuntimeInstructionNode
  | RuntimeExitNode
  | InterruptStatusNode
  | ConcurrencyLevelNode

export class RuntimeInitialNode {
  readonly tag = 'Initial'

  constructor(readonly fx: AnyFx) {}
}

export class RuntimeGeneratorNode {
  readonly tag = 'Generator'

  constructor(
    readonly generator: Generator<AnyInstruction, any>,
    readonly previous: FiberRuntimeNode | undefined,
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

  constructor(readonly exit: Exit.Exit<any, any>, readonly previous: FiberRuntimeNode) {}
}

export class InterruptStatusNode {
  readonly tag = 'InterruptStatus'
  constructor(
    readonly fx: AnyFx,
    readonly interruptStatus: boolean,
    readonly previous: RuntimeGeneratorNode | RuntimeInstructionNode,
  ) {}
}

export class ConcurrencyLevelNode {
  readonly tag = 'ConcurrencyLevel'
  constructor(
    readonly fx: AnyFx,
    readonly concurrencyLevel: NonNegativeInteger,
    readonly previous: RuntimeGeneratorNode | RuntimeInstructionNode,
  ) {}
}

function toGen<R, E, A>(fx: AnyFx): Generator<Instruction<R, E, any>, A> {
  return fx[Symbol.iterator]() as Generator<Instruction<R, E, any>, A>
}

function zipAllFuture(expected: number) {
  const future = pending<Exit.Exit<any, ReadonlyArray<any>>>()
  const exits = Array<Exit.Exit<any, ReadonlyArray<any>>>(expected)

  function onExit(exit: Exit.Exit<any, any>, index: number) {
    exits[index] = pipe(
      exit,
      Either.map((x) => [x]),
    )

    if (--expected === 0) {
      complete(success(exits.reduce(concatExitPar)))(future)
    }
  }

  return [future, onExit] as const
}
