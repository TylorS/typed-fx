import { Left, Right, isRight } from 'hkt-ts/Either'
import { Maybe, isJust } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'

import { Settable, settable } from '../Disposable/Disposable.js'
import * as Eff from '../Eff/Eff.js'
import { Exit, die, makeSequentialAssociative } from '../Exit/Exit.js'
import { Done, FiberStatus, Running, Suspended } from '../Fiber/FiberStatus.js'
import { FiberId } from '../FiberId/FiberId.js'
import { pending } from '../Future/Future.js'
import { complete } from '../Future/complete.js'
import { wait } from '../Future/wait.js'
import { Timer } from '../Timer/Timer.js'
import { success } from '../index.js'

import { Observer, Observers } from './Observers.js'
import {
  RuntimeAsync,
  RuntimeInstruction,
  RuntimeIterable,
  RuntimePromise,
} from './RuntimeInstruction.js'
import {
  ExitNode,
  GeneratorNode,
  InitialNode,
  InstructionNode,
  RuntimeGeneratorNode,
  RuntimeInstructionNode,
  RuntimeNode,
} from './RuntimeNode.js'

import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'

export class InstructionProcessor<Ctx, T extends Eff.Eff.AnyEff> {
  protected _current: RuntimeNode<Ctx, T, Eff.YieldOf<T>> | undefined
  protected _status: FiberStatus = Suspended
  protected _observers: Observers<any, any> = new Observers()
  protected _context: Stack<Ctx> = new Stack(this.initialContext)
  protected _settable: Settable = settable()

  constructor(
    readonly initialContext: Ctx,
    readonly eff: T,
    readonly timer: Timer,
    readonly onInstruction: (
      instruction: Eff.YieldOf<T>,
      context: Ctx,
    ) => RuntimeIterable<Ctx, T, any, any>,
    readonly onExit: (exit: Exit<any, any>) => Eff.Eff<Eff.YieldOf<T>, boolean>,
    readonly waitForExit: (cb: (exit: Exit<any, any>) => void) => Eff.Eff<Eff.YieldOf<T>, unknown>,
    readonly ensureEff: (eff: T, ctx: Ctx) => unknown,
    readonly interruptEff: (ctx: Ctx, id: FiberId) => Maybe<Eff.Eff<Eff.YieldOf<T>, unknown>>,
  ) {}

  get status(): FiberStatus {
    return this._status
  }

  get context(): Ctx {
    return this._context.value
  }

  readonly start = () => {
    this.running()

    while (this._current && this._status.tag !== 'Done') {
      this.processNode(this._current)
    }

    this.suspended()
  }

  readonly addObserver = (observer: Observer<any, any>) => this._observers.addObserver(observer)

  readonly interrupt = (id: FiberId) => {
    const maybe = this.interruptEff(this._context.value, id)

    // If is Interruptible, go ahead and process whatever is remaining
    if (isJust(maybe)) {
      this._current = new GeneratorNode(maybe.value[Symbol.iterator](), undefined)

      // Restart the fiber if not running
      if (this.status.tag === 'Suspended') {
        this.start()
      }

      this._settable.dispose()
    }

    // Wait on the exit value
    const future = pending<Exit<any, any>>()

    this.addObserver((exit) => complete(future)(success(exit)))

    return wait(future)
  }

  protected processNode(node: RuntimeNode<Ctx, T, Eff.YieldOf<T>>) {
    switch (node.tag) {
      // Most common nodes to process
      case 'Generator':
        return this.processGeneratorNode(node)
      case 'Instruction':
        return this.processInstructionNode(node)
      case 'RuntimeGenerator':
        return this.processRuntimeGeneratorNode(node)
      case 'RuntimeInstruction':
        return this.processRuntimeInstructionNode(node)
      // Only processed once in a Fiber
      case 'Initial':
        return this.processInitial(node)
      case 'Exit':
        return this.processExit(node)
    }
  }

  /**
   * Process a Generator node, unwinding the stack in case of failures.
   */
  protected processGeneratorNode(node: GeneratorNode<Ctx, T, Eff.YieldOf<T>>) {
    try {
      return this.processGenerator(node)
    } catch (e) {
      return this.processGeneratorFailure(node, e)
    }
  }

  /**
   * Process an instruction, unwinding the stack in case of failures.
   */
  protected processInstructionNode(node: InstructionNode<Ctx, T, Eff.YieldOf<T>>) {
    try {
      return this.processInstruction(node)
    } catch (e) {
      return this.processInstructionFailure(node, e)
    }
  }

  protected processRuntimeGeneratorNode(node: RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>) {
    try {
      return this.processRuntimeGenerator(node)
    } catch (e) {
      return this.processRuntimeGeneratorFailure(node, e)
    }
  }

  protected processRuntimeInstructionNode(node: RuntimeInstructionNode<Ctx, T, Eff.YieldOf<T>>) {
    try {
      return this.processRuntimeInstruction(node)
    } catch (e) {
      return this.processRuntimeInstructionFailure(node, e)
    }
  }

  /**
   * Call Generator.next()|.throw() to receive the next instruction.
   * If this Generator has completed, either pass the result back to the previous
   * Generator,  Eff.YieldOf<T>,f the Eff has completed - start the exit process, otherwise notify
   * any observers of the Exit.
   */
  protected processGenerator(node: GeneratorNode<Ctx, T, Eff.YieldOf<T>>) {
    const result = tryGetResult(node)

    if (!result.done) {
      this._current = new InstructionNode(result.value, node)

      return
    }

    const prev = node.previous

    // Should stop here if no previous instruction
    if (!prev) {
      return
    }

    // Continue passing values along to the previous generator.
    if (prev.tag === 'Generator' || prev.tag === 'RuntimeGenerator') {
      return this.toPrevious(prev, result.value)
    }

    // If we've sucessfully executed this Fx, lets set the Exit and
    // close the FiberScope.
    if (prev.tag === 'Initial') {
      this._current = new ExitNode(Right(result.value))

      return
    }

    // Scope has successfull closed
    if (result.value) {
      return this.finalized(prev.exit)
    }

    // Wait for the Scope to close before notifying observers
    this._current = new GeneratorNode(
      this.waitForExit((exit) => this.finalized(exit))[Symbol.iterator](),
      undefined,
    )
  }

  protected processGeneratorFailure(node: GeneratorNode<Ctx, T, Eff.YieldOf<T>>, error: unknown) {
    // If a random failure, or we're at the end of the line, go ahead and close things up.
    if (!node.previous || node.previous.tag === 'Initial') {
      this._current = new ExitNode(die(error))

      return
    }

    // If we were attempting to exit and we experienced an Error, lets append the error.
    if (node.previous.tag === 'Exit') {
      return this.finalized(
        makeSequentialAssociative<any, any>(First).concat(node.previous.exit, die(error)),
      )
    }

    // Otherwise let's unwind the Generator stack and
    node.previous.next.set(error)
    node.previous.method.set('throw')

    this._current = node.previous
  }

  protected processInstruction(node: InstructionNode<Ctx, T, Eff.YieldOf<T>>) {
    const iterable = this.onInstruction(node.instruction, this._context.value)
    this._current = new RuntimeGeneratorNode(iterable[Symbol.iterator](), node)
  }

  protected processInstructionFailure(
    node: InstructionNode<Ctx, T, Eff.YieldOf<T>>,
    error: unknown,
  ) {
    node.previous.method.set('throw')
    node.previous.next.set(error)
    this._current = node.previous
  }

  protected processRuntimeGenerator(node: RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>) {
    const result = tryGetResult(node)

    if (!result.done) {
      this._current = new RuntimeInstructionNode(result.value, node)

      return
    }

    this.toPrevious(
      node.previous.tag === 'Instruction' ? node.previous.previous : node.previous,
      result.value,
    )
  }

  protected processRuntimeGeneratorFailure(
    node: RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>,
    error: unknown,
  ) {
    // If a random failure, or we're at the end of the line, go ahead and close things up.
    if (node.previous.tag === 'Instruction') {
      return this.processInstructionFailure(node.previous, error)

      return
    }

    // Otherwise let's unwind the Generator stack
    node.previous.next.set(error)
    node.previous.method.set('throw')

    this._current = node.previous
  }

  protected processRuntimeInstruction(node: RuntimeInstructionNode<Ctx, T, Eff.YieldOf<T>>) {
    const instr = node.instruction

    switch (instr.tag) {
      case 'Async':
        return this.processAsync(instr, node.previous)
      case 'Promise':
        return this.processPromise(instr, node.previous)
      case 'Failure': {
        // If a failure has occurred, start the exit process
        this._current = new ExitNode(Left(instr.input))

        return
      }
      case 'GetContext':
        return this.toPrevious(node.previous, this._context.value)
      case 'PushContext': {
        return this.toPrevious(node.previous, (this._context = this._context.push(instr.context)))
      }
      case 'PopContext': {
        return this.toPrevious(
          node.previous,
          (this._context = this._context.pop() ?? this._context),
        )
      }
      case 'ScheduleCallback': {
        this.scheduleCallback(instr.cb)
        return this.toPrevious(node.previous, undefined)
      }
    }
  }

  protected processRuntimeInstructionFailure(
    node: RuntimeInstructionNode<Ctx, T, Eff.YieldOf<T>>,
    error: unknown,
  ) {
    node.previous.method.set('throw')
    node.previous.next.set(error)
    this._current = node.previous
  }

  protected processAsync(
    instr: RuntimeAsync<T>,
    previous: RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>,
  ) {
    const either = instr.register((eff) => {
      this._current = new RuntimeGeneratorNode(eff[Symbol.iterator](), previous)
      this.start()
    })

    if (isRight(either)) {
      return (this._current = new RuntimeGeneratorNode(either.right[Symbol.iterator](), previous))
    }

    this.ensureEff(either.left, this._context.value)
    this._current = undefined
  }

  protected processPromise(
    instr: RuntimePromise<any>,
    previous: RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>,
  ) {
    void instr.promise().then(
      (a) => {
        this.toPrevious(previous, a)
        this.start() // Restart the Fx
      },
      (e) => {
        this._current = new ExitNode(die(e))
        this.start()
      },
    )
  }

  protected toPrevious(
    previous: GeneratorNode<Ctx, T, Eff.YieldOf<T>> | RuntimeGeneratorNode<Ctx, T, Eff.YieldOf<T>>,
    value: any,
  ) {
    previous.next.set(value)
    this._current = previous
  }

  /**
   * Pop
   */
  protected processInitial(node: InitialNode<T>) {
    this._current = new GeneratorNode(node.fx[Symbol.iterator](), node)
  }

  protected processExit(node: ExitNode) {
    this._current = new GeneratorNode(this.onExit(node.exit)[Symbol.iterator](), node)
  }

  protected finalized(exit: Exit<any, any>) {
    this._current = undefined
    this._observers.notify(exit)
    this._status = Done
  }

  protected running() {
    if (this._status.tag === Suspended.tag) {
      this._status = Running
    }
  }

  protected suspended() {
    if (this._status.tag === Running.tag) {
      this._status = Suspended
    }
  }

  protected scheduleCallback(cb: () => void) {
    const inner = settable()

    inner.add(this._settable.add(inner))

    inner.add(
      this.timer.setTimer(() => {
        inner.dispose()
        cb()
      }, Delay(0)),
    )
  }
}

function tryGetResult<Ctx, T, I>(node: GeneratorNode<Ctx, T, I>): IteratorResult<I, any>
function tryGetResult<Ctx, T, I>(
  node: RuntimeGeneratorNode<Ctx, T, I>,
): IteratorResult<RuntimeInstruction<Ctx, T, any, any>, any>

function tryGetResult<Ctx, T, I>(node: GeneratorNode<Ctx, T, I> | RuntimeGeneratorNode<Ctx, T, I>) {
  const method = node.method.getAndSet('next')

  // If we're unwinding the stack, don't bother calling throw twice
  if (method === 'throw') {
    return node.generator[method](node.next.get)
  }

  try {
    return node.generator[method](node.next.get)
  } catch (e) {
    return node.generator.throw(e)
  }
}
