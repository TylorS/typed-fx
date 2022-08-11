import { pipe } from 'hkt-ts'
import { Maybe, getOrElse } from 'hkt-ts/Maybe'

import { FiberRuntime } from './FiberRuntime.js'
import { FiberState } from './FiberState.js'
import { InitialNode, RuntimeInstruction } from './RuntimeInstruction.js'
import { RuntimeProcessor } from './RuntimeProcessor.js'
import * as processors from './processors/index.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import { Exit } from '@/Exit/Exit.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Suspended } from '@/FiberStatus/index.js'
import { Fx, Of, success } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Semaphore } from '@/Semaphore/index.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export function make<R, E, A>(params: FiberRuntimeParams<R, E, A>): FiberRuntime<E, A> {
  return new FiberRuntimeImpl(
    params.fx,
    params.id,
    params.env,
    params.context,
    params.scope,
    params.trace,
    RuntimeInstruction.match(
      processors.processInitialNode,
      processors.processGeneratorNode,
      processors.processInstructionNode({}, params.context.platform.maxOpCount),
      processors.processFxNode,
      processors.processFinalizerNode,
      processors.processExitNode(params.scope),
    ),
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

export class FiberRuntimeImpl<R, E, A> implements FiberRuntime<E, A> {
  // #region Private State
  protected _started = false
  protected _current: RuntimeInstruction<R, E, A> = new InitialNode(this.fx, this.parentTrace)
  protected _status: FiberStatus = Suspended(this.context.interruptStatus)
  protected _observers: Array<(exit: Exit<E, A>) => void> = []
  protected _state: Atomic<FiberState> = Atomic<FiberState>({
    opCount: 0,
    concurrencyLevel: new Stack(new Semaphore(this.context.concurrencyLevel)),
    interruptedBy: new Set(),
    env: new Stack(this.env),
    trace: new Stack(
      pipe(
        this.parentTrace,
        getOrElse(() => EmptyTrace),
      ),
    ),
  })
  protected _disposable: Settable = settable()
  // #endregion

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly id: FiberId.Live,
    readonly env: Env<R>,
    readonly context: FiberContext,
    readonly scope: Closeable,
    readonly parentTrace: Maybe<Trace>,
    readonly processor: RuntimeProcessor,
  ) {}

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

  // TODO: Build a function that traverses the current instruction stack to build Stack Trace
  readonly trace: () => Trace = () => EmptyTrace

  // TODO: Add support for interrupting a Fiber
  readonly interruptAs: (id: FiberId) => Of<boolean> = () => success(false)
  // #endregion

  // #region Private API

  /**
   * The Event Loop
   */
  protected run(): void {
    this.running()

    while (this._current && this._status.tag !== 'Done') {
      const decision = this._state.modify((s) => this.processor(this._current, s))

      if (decision.tag === 'Running') {
        this._current = decision.instruction
      } else if (decision.tag === 'Suspend') {
        return this.suspend()
      } else {
        return this.done(decision.exit)
      }
    }
  }

  // #region Status Updates
  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Suspended(this._status.isInterruptable)
    }
  }

  protected suspend() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this._status.isInterruptable)
      this.setTimer(() => this.run(), Delay(0))
    }
  }

  protected done(exit: Exit<E, A>) {
    this._status = Done
    this._observers.forEach((o) => o(exit))
    this._observers.splice(0, this._observers.length)
  }
  // #endregion

  protected setTimer(f: () => void, delay: Delay) {
    const inner = settable()

    inner.add(
      this.context.platform.timer.setTimer(() => {
        inner.dispose()
        f()
      }, delay),
    )
  }

  // #endregion
}
