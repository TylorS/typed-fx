import { pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'
import { Maybe, getOrElse } from 'hkt-ts/Maybe'

import { FiberRuntime } from './FiberRuntime.js'
import { FiberState } from './FiberState.js'
import { InstructionProcessors } from './InstructionProcessor.js'
import { GeneratorNode, InitialNode, RuntimeInstruction } from './RuntimeInstruction.js'
import { RuntimeDecision, RuntimeProcessor } from './RuntimeProcessor.js'
import { processAccess } from './processors/Instructions/Access.js'
import { processAddTrace } from './processors/Instructions/AddTrace.js'
import { processAsync } from './processors/Instructions/Async.js'
import { processEnsuring } from './processors/Instructions/Ensuring.js'
import { getTraceUpTo, processFailure } from './processors/Instructions/Failure.js'
import { processFork } from './processors/Instructions/Fork.js'
import { processFromLazy } from './processors/Instructions/FromLazy.js'
import { processGetFiberContext } from './processors/Instructions/GetFiberContext.js'
import { processGetFiberScope } from './processors/Instructions/GetFiberScope.js'
import { processGetTrace } from './processors/Instructions/GetTrace.js'
import { processJoin } from './processors/Instructions/Join.js'
import { processProvide } from './processors/Instructions/Provide.js'
// eslint-disable-next-line import/no-cycle
import { processRaceAll } from './processors/Instructions/RaceAll.js'
import { processSetInterruptStatus } from './processors/Instructions/SetInterruptStatus.js'
import { processWait } from './processors/Instructions/Wait.js'
import { processWithConcurrency } from './processors/Instructions/WithConcurrency.js'
// eslint-disable-next-line import/no-cycle
import { processZipAll } from './processors/Instructions/ZipAll.js'
import * as processors from './processors/index.js'

import { Atomic, update } from '@/Atomic/Atomic.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Eff } from '@/Eff/Eff.js'
import { Env } from '@/Env/Env.js'
import { Exit, interrupt } from '@/Exit/Exit.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { AnyFuture, Future, addObserver } from '@/Future/Future.js'
import { Fx, Of, fromLazy, lazy, success } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Semaphore } from '@/Semaphore/index.js'
import { Stack } from '@/Stack/index.js'
import { Delay, Time } from '@/Time/index.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export function make<R, E, A>(params: FiberRuntimeParams<R, E, A>): FiberRuntime<E, A> {
  return new FiberRuntimeImpl(
    params.fx,
    params.id,
    params.env,
    params.context,
    params.scope,
    params.trace,
  )
}

export interface FiberRuntimeParams<R, E, A> {
  readonly fx: Fx<R, E, A>
  readonly id: FiberId.Live
  readonly env: Env<R>
  readonly context: FiberContext
  readonly scope: Closeable
  readonly trace: Maybe<Trace>
}

// TODO: Add support for interrupting when the status changes.

export class FiberRuntimeImpl<R, E, A> implements FiberRuntime<E, A> {
  // #region Private State
  protected _started = false
  protected _current: RuntimeInstruction = new InitialNode(this.fx, this.parentTrace)
  protected _status: FiberStatus
  protected readonly _observers: Array<(exit: Exit<E, A>) => void> = []
  protected readonly _state: Atomic<FiberState> = Atomic<FiberState>({
    opCount: 0,
    concurrencyLevel: new Stack(new Semaphore(this.context.concurrencyLevel)),
    interruptStatus: new Stack(this.context.interruptStatus),
    interruptedBy: new Set(),
    env: new Stack(this.env),
    trace: new Stack(
      pipe(
        this.parentTrace,
        getOrElse(() => EmptyTrace),
      ),
    ),
  })
  protected readonly _disposable: Settable = settable()
  protected readonly processor: RuntimeProcessor
  // #endregion

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly id: FiberId.Live,
    readonly env: Env<R>,
    readonly context: FiberContext,
    readonly scope: Closeable,
    readonly parentTrace: Maybe<Trace>,
  ) {
    this.processor = RuntimeInstruction.match(
      processors.processInitialNode,
      processors.processGeneratorNode,
      processors.processInstructionNode(
        makeInstructionProcessors(this),
        context.platform.maxOpCount,
      ),
      processors.processFxNode,
      processors.processFinalizerNode,
      processors.processPopNode,
      processors.processExitNode(scope),
    )
    this._status = Suspended(this.getInterruptStatus)

    scope.ensuring((exit) => fromLazy(() => this.done(exit)))
  }

  // #region Public API
  readonly start = () => {
    // Can only be manually started once.
    if (this._started) {
      return false
    }

    this._started = true

    this.run()

    return true
  }

  /**
   * Check the current status of the Fiber
   */
  readonly status = (): FiberStatus => this._status

  /**
   * And an observer to the Fiber's Exit value.
   */
  readonly addObserver = (cb: (exit: Exit<E, A>) => void): Disposable => {
    this._observers.push(cb)

    return Disposable(() => {
      const i = this._observers.indexOf(cb)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  readonly trace: () => Trace = () =>
    getTraceUpTo(this._state.get().trace, this.context.platform.maxOpCount)

  readonly interruptAs: (id: FiberId) => Of<boolean> = (id) =>
    lazy(() => {
      const { interruptStatus } = this._state.get()

      if (interruptStatus) {
        return this.scope.close(interrupt(id))
      }

      pipe(
        this._state,
        update((s) => ({ ...s, interruptedBy: new Set([...s.interruptedBy, id]) })),
      )

      return success(false)
    })

  // #endregion

  // #region Private API

  /**
   * The Event Loop
   */
  protected run(): void {
    this.running()

    console.log(this._status.tag)

    while (this._status.tag === 'Running') {
      // Use the provided processor to update state and determine the next thing to do.
      const decision = this._state.modify((s) => this.processor(this._current, s))
      const tag = decision.tag

      console.log(this.id.sequenceNumber, printDecision(decision))

      // Yield to other Fibers cooperatively by scheduling a task using Timer.
      if (tag === 'Suspend') {
        return this.suspend()
      }

      // Wait on a Future to resolve
      if (tag === 'Await') {
        return this.await(decision.future, decision.finalizer, decision.previous)
      }

      // The Fiber has completed
      if (tag === 'Done') {
        return this.done(decision.exit)
      }

      // Continue through the while-loop
      this._current = decision.instruction
    }
  }

  // #region Status Updates
  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running(this.getInterruptStatus)
    }
  }

  protected suspend() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this.getInterruptStatus)
      this.setTimer(() => this.run(), Delay(0))
    }
  }

  protected await(future: AnyFuture, finalizer: Finalizer, previous: RuntimeInstruction) {
    const inner = settable()
    const cleanup = this.scope.ensuring(finalizer)
    this._status = Suspended(this.getInterruptStatus)

    inner.add(
      this._disposable.add(
        addObserver(future as Future<any, any, any>, (fx) => {
          this._current = new GeneratorNode(
            Eff.gen(
              Fx(function* () {
                inner.dispose()

                yield* cleanup(Right(undefined))

                return yield* fx
              }),
            ),
            previous,
          )
          this.run()
        }),
      ),
    )
  }

  protected done(exit: Exit<E, A>) {
    this._status = Done
    this.notify(exit)
  }

  // #endregion

  protected notify(exit: Exit<E, A>) {
    this._observers.forEach((o) => o(exit))
    this._observers.splice(0, this._observers.length)
  }

  protected getInterruptStatus = () => this._state.get().interruptStatus.value

  protected setTimer = (f: (time: Time) => void, delay: Delay): Disposable => {
    const inner = settable()

    inner.add(
      this.context.platform.timer.setTimer((time) => {
        inner.dispose()
        f(time)
      }, delay),
    )

    return inner
  }

  // #endregion
}

const makeInstructionProcessors = <R, E, A>(runtime: FiberRuntimeImpl<R, E, A>) => {
  const { id, context, scope } = runtime
  const maxOpCount = context.platform.maxOpCount

  const processors: InstructionProcessors = {
    Access: processAccess,
    AddTrace: processAddTrace,
    Async: processAsync(scope),
    Ensuring: processEnsuring,
    Failure: processFailure(maxOpCount),
    Fork: processFork(context, scope),
    FromLazy: processFromLazy,
    GetFiberContext: processGetFiberContext(context),
    GetFiberScope: processGetFiberScope(scope),
    GetTrace: processGetTrace(maxOpCount),
    Join: processJoin,
    Provide: processProvide,
    RaceAll: processRaceAll(id, context, scope),
    SetInterruptStatus: processSetInterruptStatus,
    Wait: processWait as InstructionProcessors['Wait'],
    WithConcurrency: processWithConcurrency,
    ZipAll: processZipAll(id, context, scope),
  }

  return processors
}

function printDecision(decision: RuntimeDecision): string {
  switch (decision.tag) {
    case 'Await':
      return `Await ${JSON.stringify(decision.future.state.get(), null, 2)}`
    case 'Done':
      return `Done ${JSON.stringify(decision.exit, null, 2)}`
    case 'Running': {
      const instr = decision.instruction

      switch (instr.tag) {
        case 'Instruction':
          return `Running: Instruction: ${instr.instruction.tag}`
      }

      return `Running: ${decision.instruction.tag}`
    }
    case 'Suspend': {
      return `Suspend`
    }
  }
}
