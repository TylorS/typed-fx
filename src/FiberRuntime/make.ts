import { pipe } from 'hkt-ts'
import { Right, isLeft } from 'hkt-ts/Either'

import { FiberRuntime } from './FiberRuntime.js'
import { FiberState } from './FiberState.js'
import { InstructionProcessors } from './InstructionProcessor.js'
import {
  FailureNode,
  GeneratorNode,
  InitialNode,
  RuntimeInstruction,
} from './RuntimeInstruction.js'
import { RuntimeProcessor } from './RuntimeProcessor.js'
import { processAccess } from './processors/Instructions/Access.js'
import { processAddTrace } from './processors/Instructions/AddTrace.js'
import { processAsync } from './processors/Instructions/Async.js'
import { processEnsuring } from './processors/Instructions/Ensuring.js'
import { processFailure } from './processors/Instructions/Failure.js'
import { processFork } from './processors/Instructions/Fork.js'
import { processFromLazy } from './processors/Instructions/FromLazy.js'
import { processGetFiberContext } from './processors/Instructions/GetFiberContext.js'
import { processGetFiberScope } from './processors/Instructions/GetFiberScope.js'
import { processGetStackTrace } from './processors/Instructions/GetStackTrace.js'
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
import { toFiber } from './toFiber.js'

import { Atomic, update } from '@/Atomic/Atomic.js'
import { died, traced } from '@/Cause/Cause.js'
import { prettyPrint } from '@/Cause/Renderer.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Eff } from '@/Eff/Eff.js'
import { Env } from '@/Env/Env.js'
import { Exit, interrupt } from '@/Exit/Exit.js'
import { Live } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { AnyFuture, Future, addObserver } from '@/Future/Future.js'
import { Fx, Of, lazy, success } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Semaphore } from '@/Semaphore/index.js'
import { Stack } from '@/Stack/index.js'
import { None, Supervisor } from '@/Supervisor/Supervisor.js'
import { Delay, Time } from '@/Time/index.js'
import { Trace, getTraceUpTo, getTrimmedTrace } from '@/Trace/Trace.js'

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
  readonly trace: Stack<Trace>
}

export class FiberRuntimeImpl<R, E, A> implements FiberRuntime<E, A> {
  // #region Private State
  protected _started = false
  protected _current: RuntimeInstruction = new InitialNode(this.fx)
  protected _status: FiberStatus
  protected readonly _observers: Array<(exit: Exit<E, A>) => void> = []
  protected readonly _state: Atomic<FiberState> = Atomic<FiberState>({
    opCount: 0,
    concurrencyLevel: new Stack(new Semaphore(this.context.concurrencyLevel)),
    interruptStatus: new Stack(this.context.interruptStatus),
    interruptedBy: new Set(),
    env: new Stack(this.env),
    trace: this.parentTrace,
  })
  protected readonly _disposable: Settable = settable()
  protected readonly processor: RuntimeProcessor
  protected readonly fiber: Live<E, A>
  // #endregion

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly id: FiberId.Live,
    readonly env: Env<R>,
    readonly context: FiberContext,
    readonly scope: Closeable,
    readonly parentTrace: Stack<Trace>,
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
      processors.processFailureNode,
    )
    this._status = Suspended(this.getInterruptStatus)
    this.fiber = toFiber(this, context, scope)
  }

  // #region Public API

  readonly start = (): boolean => {
    // Can only be manually started once.
    if (this._started) {
      return false
    }

    this._started = true

    this.withSupervisor((s) => s.onStart(this.fiber, this.fx))

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
    getTraceUpTo(this._state.get().trace, this.context.platform.maxTraceCount)

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

    while (this._status.tag === 'Running') {
      try {
        this.process()
      } catch (e) {
        this.uncaughtException(e)
      }
    }
  }

  protected process() {
    // Use the provided processor to update state and determine the next thing to do.

    const current = this._current

    if (current.tag === 'Instruction') {
      this.withSupervisor((s) => s.onInstruction(this.fiber, current.instruction))
    }

    const decision = this._state.modify((s) => this.processor(current, s))
    const tag = decision.tag

    // console.log(this.id.sequenceNumber, printDecision(decision))

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

  // #region Status Updates
  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running(this.getInterruptStatus)
      this.withSupervisor((s) => s.onRunning(this.fiber))
    }
  }

  protected suspend() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this.getInterruptStatus)
      this.setTimer(() => this.run())
      this.withSupervisor((s) => s.onSuspended(this.fiber))
    }
  }

  protected await(future: AnyFuture, finalizer: Finalizer, previous: RuntimeInstruction) {
    const cleanup = this.scope.ensuring(finalizer)
    const state = future.state.get()

    if (state.tag === 'Resolved') {
      return (this._current = new GeneratorNode(
        Eff.gen(
          Fx(function* () {
            const a = yield* state.fx

            yield* cleanup(Right(a))

            return a
          }),
        ),
        previous,
      ))
    }

    const inner = settable()

    inner.add(
      this._disposable.add(
        addObserver(future as Future<any, any, any>, (fx) => {
          this._current = new GeneratorNode(
            Eff.gen(
              Fx(function* () {
                inner.dispose()

                const a = yield* fx

                yield* cleanup(Right(a))

                return a
              }),
            ),
            previous,
          )

          this.setTimer(() => this.run())
        }),
      ),
    )

    this._status = Suspended(this.getInterruptStatus)

    // reset the opCount to 0 when we do asynchronous operations as we naturally
    // allow for other fibers to run cooperatively. We really just wanna yield for
    // synchronous operations.
    pipe(
      this._state,
      update((s) => ({ ...s, opCount: 0 })),
    )

    this.withSupervisor((s) => s.onSuspended(this.fiber))
  }

  protected done(exit: Exit<E, A>) {
    this._status = Done
    this.withSupervisor((s) => s.onEnd(this.fiber, exit))

    if (this._observers.length > 0) {
      this._observers.forEach((o) => o(exit))
      this._observers.splice(0, this._observers.length)
    } else if (isLeft(exit)) {
      // If there are no observers, report the Failure so it doesn't get lost.
      const { platform, renderer } = this.context

      platform.reportFailure(prettyPrint(exit.left, renderer))
    }
  }

  // #endregion

  protected uncaughtException(error: unknown) {
    const cause = died(error)
    const state = this._state.get()
    const trace = getTrimmedTrace(cause, state.trace)
    const finalCause = traced(
      getTraceUpTo(state.trace.push(trace), this.context.platform.maxTraceCount),
    )(cause)

    this._current = new FailureNode(finalCause, this._current)
  }

  protected getInterruptStatus = () => this._state.get().interruptStatus.value

  protected setTimer = (f: (time: Time) => void): Disposable => {
    const inner = settable()

    inner.add(
      this._disposable.add(
        this.context.platform.timer.setTimer((time) => {
          inner.dispose()
          f(time)
        }, Delay(0)),
      ),
    )

    return inner
  }

  protected withSupervisor = (f: (supervisor: Supervisor<any>) => void) => {
    if (this.context.supervisor !== None) {
      f(this.context.supervisor)
    }
  }

  // #endregion
}

const makeInstructionProcessors = <R, E, A>(runtime: FiberRuntimeImpl<R, E, A>) => {
  const { id, context, scope } = runtime
  const { maxTraceCount } = context.platform

  const processors: InstructionProcessors = {
    Access: processAccess,
    AddTrace: processAddTrace,
    Async: processAsync(id),
    Ensuring: processEnsuring,
    Failure: processFailure(maxTraceCount),
    Fork: processFork(context, scope),
    FromLazy: processFromLazy,
    GetFiberContext: processGetFiberContext(context),
    GetFiberScope: processGetFiberScope(scope),
    GetStackTrace: processGetStackTrace,
    Join: processJoin,
    Provide: processProvide,
    RaceAll: processRaceAll(id, context, scope),
    SetInterruptStatus: processSetInterruptStatus,
    Wait: processWait,
    WithConcurrency: processWithConcurrency,
    ZipAll: processZipAll(id, context, scope),
  }

  return processors
}

// function printDecision(decision: RuntimeDecision): string {
//   switch (decision.tag) {
//     case 'Await':
//       return `Await ${JSON.stringify(decision.future.state.get(), null, 2)}`
//     case 'Done':
//       return `Done ${JSON.stringify(decision.exit, null, 2)}`
//     case 'Running': {
//       const instr = decision.instruction

//       switch (instr.tag) {
//         case 'Instruction':
//           return `Running: Instruction: ${instr.instruction.tag}`
//       }

//       return `Running: ${decision.instruction.tag}`
//     }
//     case 'Suspend': {
//       return `Suspend`
//     }
//   }
// }
