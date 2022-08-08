import { constant, pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import { Left, Right, isRight } from 'hkt-ts/Either'
import { Just, Maybe, Nothing, toArray } from 'hkt-ts/Maybe'
import { reverse } from 'hkt-ts/Typeclass/Ord'
import * as N from 'hkt-ts/number'

import { Eff, unit } from '../Eff.js'
import { pending } from '../Future/Future.js'
import { MutableFutureQueue } from '../Future/MutableFutureQueue.js'
import { complete } from '../Future/complete.js'
import { wait } from '../Future/wait.js'
import { Async } from '../Instructions/Async.js'
import { Ensuring } from '../Instructions/Ensuring.js'
import { Failure } from '../Instructions/Failure.js'
import { FromLazy } from '../Instructions/FromLazy.js'
import { GetInterruptStatus, SetInterruptStatus } from '../Instructions/SetInterruptStatus.js'
import { AddTrace, GetTrace } from '../Instructions/Trace.js'

import { Heap } from './Heap.js'
import { ErrorsFromInstruction, PushInstruction } from './Instruction.js'
import { Observer, Observers } from './Observers.js'
import { ProcessorEff } from './ProcessorEff.js'
import {
  ArbitraryEffNode,
  FinalizerNode,
  InitialNode,
  InstructionGeneratorNode,
  InstructionNode,
  ProcessorStack,
  RuntimeGeneratorNode,
  RuntimeInstructionNode,
} from './ProcessorStack.js'

import { died, traced } from '@/Cause/Cause.js'
import { CauseError } from '@/Cause/CauseError.js'
import { Disposable, settable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import { Done, FiberStatus, Running, Suspended, setInterruptStatus } from '@/FiberStatus/index.js'
import { Platform } from '@/Platform/Platform.js'
import * as StackFrame from '@/StackFrame/StackFrame.js'
import { Delay } from '@/Time/index.js'
import * as Trace from '@/Trace/index.js'

const containsStackFrame = A.contains(StackFrame.Eq)

export interface ProcessParams {
  /**
   * The core platform features required by a Process
   */
  readonly platform: Platform
  /**
   * The Heap which is available while processing each Instruction Y
   */
  readonly heap: Heap
  /**
   * The Trace that exists before creating this process.
   */
  readonly trace: Maybe<Trace.Trace>
}

// TODO: Should only unexpected errors be thrown into Generators?

/**
 * Process is an interpreter for any arbitrary Eff. It has some built-in support for
 * a few instructions of its own when are intended to help write other interpreters that
 * gain the same features. These features include:
 *  - Asynchrony, use generators to write asynchounous code that looks synchronous
 *  - Failures, never lose a failure
 *  - Tracing, enhancing stack traces with compile-time information
 *  - Finalization, a là try/finally
 *  - Running arbitary Effs within the process' context
 *  - Interruption, control which regions of Eff can and can not be interrupted.
 *  - Cooperatively yielding to other processes
 *
 * Given these features, it is natural to create Fibers to represent your Effects to wrap
 * around a Process that handles a particular set of Instructions.
 */
export class Process<Y, A> {
  /**
   * The current stack of instructions
   */
  protected _current: ProcessorStack<Y, any> | undefined
  /**
   * The current status of the process
   */
  protected _status: FiberStatus = Suspended(true)
  /**
   * Process should only be started onces
   */
  protected _started = false
  /**
   * Current operation count
   */
  protected _opCount = 0
  /**
   * Current number of running arbitary Effs
   */
  protected _runningArbitary = 0

  /**
   * Incrementing ID for each Async operation.
   */
  protected _asyncID = 0
  /**
   * Async ID to the previous Stack state to resume to. Also utilized when an Arbitrary Eff is run
   * while an Async operation is Suspended.
   */
  protected _asyncToPreviousState = new Map<number, ProcessorStack<Y, any>>()

  /**
   * Pointer to the last Instruction ran. Used to avoid counting an Instruction that is also a RuntimeInstruction twice
   * to avoid yielding cooperatively prematurely.
   */
  protected _previousInstruction: any

  /**
   * Keeps track of an Arbitrary Effs that need to be run when this process can be interrupted.
   */
  protected readonly _interruptable = MutableFutureQueue<never, void>()
  /**
   * Keeps track of any Timers used for asynchrony.
   */
  protected readonly _settable = settable()
  /**
   * Keeps track of an observers of this Process' exit value.
   */
  protected readonly _observers: Observers<ErrorsFromInstruction<Y>, A> = new Observers(true)
  /**
   * Keeps track of when this Process has been suspended for Asynchrony.
   */
  protected readonly _suspended: Observers<never, void> = new Observers(false)

  constructor(
    /**
     * The main Eff in which this process is handling
     */
    readonly eff: Eff<Y, A>,
    /**
     * The params used to create this process.
     */
    readonly params: ProcessParams,
    /**
     * The processor responsible for using the Heap to convert Instructions into a ProcessEff
     */
    readonly processYield: (
      instruction: Y,
      heap: Heap,
      platform: Platform,
    ) => ProcessorEff<Y, ErrorsFromInstruction<Y>, any>,
  ) {
    this._current = new InitialNode(eff)
  }

  /**
   * Get the current status of the Process.
   */
  get status(): FiberStatus {
    return this._status
  }

  /**
   * A Processor can only be started once. Returns a boolean
   * on whether or not the process started. See Processor.status
   * for further information about the process.
   */
  readonly start = (): boolean => {
    if (this._started) {
      return false
    }

    this.run()

    return true
  }

  /**
   * Add an Observer to the Process
   */
  readonly addObserver = (observer: Observer<ErrorsFromInstruction<Y>, A>): Disposable =>
    this._observers.addObserver(observer)

  /**
   * Run an Eff within this Process. If it is not interruptable, it will
   * supsend the running Process until it is.
   */
  readonly runEff = <B>(
    eff: Eff<Y, B>,
  ): Eff<Async<never, any, never>, Exit<ErrorsFromInstruction<Y>, B>> => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Eff(function* () {
      if (that._status.tag === 'Done' || that.status.isInterruptable) {
        return yield* that.runArbitraryEff(eff)
      }

      return yield* that.whenInterruptable(eff)
    })
  }

  // Internals

  protected run = (): void => {
    this.running()

    while (this._current) {
      this.processStack(this._current)
    }

    this.suspended()
  }

  /**
   * Updates the current FiberStatus to Running
   */
  protected running() {
    this._started = true
    if (this._status.tag === 'Suspended') {
      this._status = Running(this._status.isInterruptable)
    }
  }

  /**
   * Updates the current FiberStatus to Suspended
   */
  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this._status.isInterruptable)
      this._suspended.notify(Right(undefined))
    }
  }

  /**
   * The last think to run in a Process.
   */
  protected finalize(exit: Exit<ErrorsFromInstruction<Y>, A>) {
    this._suspended.notify(Right(undefined))
    this._settable.dispose()
    this._observers.notify(exit)
    this._status = Done
  }

  /**
   * Process the current node in the Stack
   */
  protected processStack(current: ProcessorStack<Y, any>) {
    // console.log('Stack', current.tag)

    switch (current.tag) {
      // Roughly ordered based on order of occurence, though it really depends on
      // the Eff's usage on RuntimeInstructions to operate
      case 'InstructionGenerator':
        return this.processInstructionGenerator(current)
      case 'RuntimeGenerator':
        return this.processRuntimeGenerator(current)
      case 'Instruction': {
        this.processInstruction(current)
        this._previousInstruction = current.instruction
        return this.yieldNowIfNeeded()
      }
      case 'RuntimeInstruction': {
        this.processRuntimeInstruction(current)

        // Avoid counting a single Instruction twice
        if (this._previousInstruction !== current.instruction) {
          this.yieldNowIfNeeded()
        }

        return
      }
      case 'Finalizer':
        return this.processFinalizer(current)
      // Only runs sometimes
      case 'ArbitraryEff':
        return this.processArbitraryEff(current)
      // Runs just once per Process
      case 'Initial':
        return (this._current = current.forward(this.params.trace))
    }
  }

  /**
   * Step over an InstructionGenerator's yields
   */
  protected processInstructionGenerator(current: InstructionGeneratorNode<Y, any>) {
    try {
      const result = current.next()

      // console.log('InstructionGenerator', result.value)

      if (result.done) {
        const exit = Right(result.value)
        const runningArbitary = this._runningArbitary
        const prev = current.back(exit)

        // Only finalize if there are no more instructions and we are not running an arbitrary Eff
        if (!prev && runningArbitary === 0) {
          this.finalize(exit)
        }

        this._current = prev

        return
      }

      this._current = current.forward(result.value, getTraceFromYield(result.value))
    } catch (e) {
      const exit = this.getErrorExit(e, current)
      const runningArbitary = this._runningArbitary
      const prev = current.back(exit)

      // Only finalize if there are no more instructions and we are not running an arbitrary Eff
      if (!prev && runningArbitary === 0) {
        this.finalize(exit)
      }

      this._current = prev
    }
  }

  /**
   * Process an Eff's Instruction Set
   */
  protected processInstruction(current: InstructionNode<Y>) {
    this._current = new RuntimeGeneratorNode(
      this.processYield(current.instruction, this.params.heap, this.params.platform)[
        Symbol.iterator
      ](),
      current,
    )
  }

  /**
   * Step over an RuntimeGenerator's instructions
   */
  protected processRuntimeGenerator(current: RuntimeGeneratorNode<Y, any>) {
    try {
      const result = current.next()

      // console.log('RuntimeGenerator', result.value)

      if (result.done) {
        return (this._current = current.back(Right(result.value)))
      }

      this._current = current.forward(result.value, getTraceFromYield(result.value))
    } catch (e) {
      this._current = current.back(this.getErrorExit(e, current))
    }
  }

  /**
   * Process a Runtime Instruction
   */
  protected processRuntimeInstruction(current: RuntimeInstructionNode<Y, any>) {
    const instr = current.instruction

    // console.log('Runtime', instr.tag)

    switch (instr.tag) {
      case 'FromLazy':
        return this.processFromLazy(instr, current)
      case 'PushInstruction':
        return this.processPushInstruction(instr, current)
      case 'Failure':
        return this.processFailure(instr, current)
      case 'Ensuring':
        return this.processEnsuring(instr, current)
      case 'SetInterruptStatus':
        return this.processInterruptStatus(instr, current)
      case 'Async':
        return this.processAsync(instr, current)
      case 'AddTrace':
        return this.processAddTrace(instr, current)
      case 'GetTrace':
        return this.processGetTrace(instr, current)
    }
  }

  /**
   * Process running an Arbitrary Eff within this Process.
   */
  protected processArbitraryEff(current: ArbitraryEffNode<Y, any>) {
    this._current = current.forward()
  }

  /**
   * Process Finalizer
   */
  protected processFinalizer(current: FinalizerNode<Y, any>) {
    this._current = current.forward()
  }

  /**
   * Process Asynchronous instruction.
   */
  protected processAsync(instr: Async<Y, any, Y>, current: ProcessorStack<Y, any>) {
    let returnedSynchronously = false

    const id = this._asyncID++

    const either = instr.input((eff) => {
      returnedSynchronously = true

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const previousState = this._asyncToPreviousState.get(id)!

      // If we started an Arbitrary Eff in the meantime, lets save our place to return to later.
      if (this._current) {
        this._asyncToPreviousState.set(
          id,
          new InstructionGeneratorNode(eff[Symbol.iterator](), previousState, Nothing),
        )
      } else {
        this._current = new InstructionGeneratorNode(eff[Symbol.iterator](), previousState, Nothing)
      }

      this._asyncToPreviousState.delete(id)

      this.run()
    })

    // If we can continue synchronously, lets do so
    if (isRight(either)) {
      return (this._current = new InstructionGeneratorNode(
        either.right[Symbol.iterator](),
        current,
        Nothing,
      ))
    } else {
      this._asyncToPreviousState.set(
        id,
        new FinalizerNode(Eff.of('never called'), constant(either.left), Nothing, current),
      )
    }

    // If the register was actually synchronous, just let things continue processing
    if (returnedSynchronously) {
      return
    }

    // Otherwise clear the stack and wait for the Async process to resume
    this._current = undefined
  }

  /**
   * Process Failure, appending a Runtime Trace to the current Stack.
   */
  protected processFailure(
    instr: Failure<ErrorsFromInstruction<Y>>,
    current: RuntimeInstructionNode<Y, any>,
  ) {
    const currentTrace = this.getTrace(current)
    const runtimeTrace = Trace.Trace.runtime(new Error(), Failure)
    const traceToCompare = findAllTraces(current, runtimeTrace.frames.length)
    const remaining = trimOverlappingTraces(
      traceToCompare.tag === 'EmptyTrace'
        ? []
        : traceToCompare.frames.filter((x) => x.tag === 'Runtime'),
      runtimeTrace.frames,
    )
    const trace = A.isNonEmpty(remaining)
      ? Trace.Associative.concat(new Trace.StackFrameTrace(remaining), currentTrace)
      : currentTrace

    this._current = current.back(
      Left(trace.tag !== 'EmptyTrace' ? traced(trace)(instr.input) : instr.input),
    )
  }

  /**
   * Construct a Finalizer Node.
   */
  protected processEnsuring(
    instr: Ensuring<Y, ErrorsFromInstruction<Y>, Y>,
    current: RuntimeInstructionNode<Y, any>,
  ) {
    const [eff, finalizer] = instr.input
    this._current = new FinalizerNode(eff, finalizer, Nothing, current)
  }

  /**
   * Mark the current region's interrupt status, and pop it off once complete.
   */
  protected processInterruptStatus(
    instr: SetInterruptStatus<Y, any>,
    current: RuntimeInstructionNode<Y, any>,
  ) {
    const [eff, status] = instr.input
    const currentStatus = this._status
    this._status = pipe(this._status, setInterruptStatus(status))
    this.onInterruptStatusUpdate(status)

    const resetStatus = () => {
      this._status = pipe(this._status, setInterruptStatus(currentStatus.isInterruptable))
      this.onInterruptStatusUpdate(currentStatus.isInterruptable)
    }

    this._current = new FinalizerNode(
      eff,
      () =>
        // eslint-disable-next-line require-yield
        Eff(function* () {
          resetStatus()
        }),
      Nothing,
      current,
    )
  }

  /**
   * Add a Trace to the current Stack.
   */
  protected processAddTrace(_: AddTrace<Y, any>, current: RuntimeInstructionNode<Y, any>) {
    const [eff, trace] = _.input

    this._current = new InstructionGeneratorNode(eff[Symbol.iterator](), current, Just(trace))
  }

  /**
   * Get the Current Stack Trace up to the Platform's configured max length.
   */
  protected processGetTrace(_: GetTrace, current: RuntimeInstructionNode<Y, any>) {
    this._current = current.back(Right(this.getTrace(current)))
  }

  /**
   * Get the Interrupt Status of the process.
   */
  protected processGetInterruptStatus(
    _: GetInterruptStatus,
    current: RuntimeInstructionNode<Y, any>,
  ) {
    return current.back(Right(this._status.isInterruptable))
  }

  /**
   * Process Synchronous effects.
   */
  protected processFromLazy(instr: FromLazy<any>, current: RuntimeInstructionNode<Y, any>) {
    this._current = current.back(Right(instr.input()))
  }

  /**
   * Process Nested Effs in the Call stack
   */
  protected processPushInstruction(
    instr: PushInstruction<Y, any>,
    current: RuntimeInstructionNode<Y, any>,
  ) {
    this._current = new InstructionGeneratorNode(instr.input[Symbol.iterator](), current, Nothing)
  }

  /**
   * Track the current number of ops that have been called in this Process, if it is equal to the Platform's configured
   * maxOpCount, it will Asynchronously yield to other Fibers.
   */
  protected yieldNowIfNeeded() {
    if (++this._opCount === this.params.platform.maxOpCount) {
      this._opCount = 0

      // Save the current stack for later.
      const current = this._current
      this._current = undefined

      const restart = () => {
        this._current = current

        this.run()
      }

      this.setTimer(() => {
        // If another Eff has begun running
        if (this._current !== undefined) {
          return this._suspended.addObserver(restart)
        }

        restart()
      })
    }
  }

  /**
   * Wait for the Fiber to become Interruptable again, and then run the arbitary Eff.
   */
  protected whenInterruptable = <B>(
    eff: Eff<Y, B>,
  ): Eff<Async<never, any, never>, Exit<ErrorsFromInstruction<Y>, B>> => {
    const { runArbitraryEff, _interruptable } = this

    const [future] = _interruptable.waitFor(1)

    return Eff(function* () {
      yield* wait(future)

      return yield* runArbitraryEff(eff)
    })
  }

  /**
   * Run an Arbitrary Eff within the current process' context.
   */
  protected runArbitraryEff = <B>(
    eff: Eff<Y, B>,
  ): Eff<Async<never, any, never>, Exit<ErrorsFromInstruction<Y>, B>> => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Eff(function* () {
      const future = pending<never, Exit<ErrorsFromInstruction<Y>, B>>()

      const previous = that._current ?? that.getUnfinishedAsync()

      that._runningArbitary++
      that._current = new ArbitraryEffNode<Y, B>(
        eff,
        // If we don't have somewhere to return to already, we must be waiting on an Async operation
        // So we'll grab the previously unfinshed Async stack to continue to
        previous,
        (exit) => {
          that._runningArbitary--

          complete(future)(Eff.of(exit))

          if (!previous) {
            const prevAsync = that.getUnfinishedAsync()

            if (prevAsync) {
              that._current = prevAsync
              that.run()
            }
          }
        },
      )

      that.run()

      return yield* wait(future)
    })
  }

  /**
   * Attempt to find the last Async to return. Only used when an ArbitraryEff tries to run while this Process
   * is currently Suspended.
   */
  protected getUnfinishedAsync() {
    if (this._asyncToPreviousState.size === 0) {
      return
    }

    const [newestKey] = A.sort(reverse(N.Ord))(Array.from(this._asyncToPreviousState.keys()))
    const stack = this._asyncToPreviousState.get(newestKey)

    this._asyncToPreviousState.delete(newestKey)

    return stack
  }

  /**
   * Get the current Trace for the Process.
   */
  protected getTrace(node: ProcessorStack<Y, any>) {
    return findAllTraces(node, this.params.platform.maxTraceCount)
  }

  /**
   * Get an Exit from an Error
   */
  protected getErrorExit(e: unknown, stack: ProcessorStack<Y, any>) {
    if (e instanceof CauseError) {
      return Left(e.causedBy)
    }

    const trace = this.getTrace(stack)

    return Left(trace.tag === 'EmptyTrace' ? died(e) : traced(trace)(died(e)))
  }

  /**
   * Notify listeners interested in when the Process becomes interruptable.
   */
  protected onInterruptStatusUpdate(status: boolean) {
    if (status && this._interruptable.size() > 0) {
      this._interruptable.all(unit)
    }
  }

  /**
   * Set a Timer and track its resources.
   */
  protected setTimer(f: () => void) {
    const inner = settable()

    inner.add(
      this._settable.add(
        this.params.platform.timer.setTimer(() => {
          inner.dispose()
          f()
        }, Delay(0)),
      ),
    )
  }
}

function getTraceFromYield(instr: any): Maybe<Trace.Trace> {
  if (instr && typeof instr.__trace === 'string') {
    return Just(Trace.Trace.custom(instr.__trace))
  }

  return Nothing
}

function findAllTraces<Y, R>(stack: ProcessorStack<Y, R>, amount: number): Trace.Trace {
  const traces: Array<StackFrame.StackFrame> = []

  let current: ProcessorStack<Y, any> | undefined = stack

  while (current && current.tag !== 'Initial' && traces.length < amount) {
    if (
      current.tag === 'Instruction' ||
      current.tag === 'RuntimeInstruction' ||
      current.tag === 'InstructionGenerator'
    ) {
      traces.push(
        ...toArray(current.trace).flatMap((x) => (x.tag === 'EmptyTrace' ? [] : x.frames)),
      )
    }

    current = current.previous
  }

  return A.isNonEmpty(traces)
    ? new Trace.StackFrameTrace(traces.slice(0, amount))
    : Trace.EmptyTrace
}

function trimOverlappingTraces(
  current: ReadonlyArray<StackFrame.StackFrame>,
  incoming: ReadonlyArray<StackFrame.StackFrame>,
) {
  const existing = A.intersection(StackFrame.Eq)(incoming)(current)
  const containsFrame = (x: StackFrame.StackFrame) => containsStackFrame(x)(existing)

  return existing.length === 0
    ? incoming
    : incoming.filter((x) => (x.tag === 'Runtime' ? !containsFrame(x) : true))
}
