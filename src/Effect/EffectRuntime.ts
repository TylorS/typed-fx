import { Maybe, flow, pipe } from 'hkt-ts'
import { Left, Right, isLeft, match } from 'hkt-ts/Either'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import { concatAll } from 'hkt-ts/Typeclass/Associative'
import { NonNegativeInteger } from 'hkt-ts/number'

import * as Effect from './Effect.js'
import { EffectContext } from './EffectContext.js'
import {
  EffectFrame,
  EffectStack,
  FlatMapFrame,
  InterruptFrame,
  MapFrame,
  MatchFrame,
  OrElseFrame,
  PopFrame,
} from './EffectStack.js'
import { Done, EffectStatus, Running, Suspended } from './EffectStatus.js'
import { Future } from './Future.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { prettyPrint } from '@/Cause/Renderer.js'
import * as Cause from '@/Cause/index.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import * as FiberId from '@/FiberId/FiberId.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'
import * as Trace from '@/Trace/Trace.js'

// TODO: Allow Running Arbitrary Effects within the Runtime instead of Interrupt
// TODO: Supervision ?
// TODO: Both
// TODO: Either
// TODO: Eagerly evaluate Both/Either for optimization

const CauseSeqAssoc = Cause.makeSequentialAssociative<any>()
const concatAllSeqCause = concatAll(CauseSeqAssoc)

export class EffectRuntime<Fx extends Effect.Effect.AnyIO, E, A> {
  // Fully internalized state
  protected _started = false // Whether or not this fiber has been manually started yet
  protected _current: Maybe.Maybe<Effect.Effect<any, any, any>> = Maybe.Nothing // The current Effect to process
  protected _stack: EffectStack | null = null // The control flow for returning Exit values
  protected _observers: Array<Observer<E, A>> = [] // Allow of the observers of this Fiber's exit value.
  protected _disposable: Maybe.Maybe<Settable> = Maybe.Nothing // Any resources that should be cleaned up after the effect is complete.
  protected _children = Atomic<ReadonlyArray<EffectRuntime<any, any, any>>>([]) // Any child Fiber forked from this Runtime.

  // Sampled view EffectRuntime.status
  protected _status: EffectStatus<E, A> = Suspended

  // Sampled state via EffectRuntime.state
  protected _remainingOpCount: NonNegativeInteger
  protected _handlers: Atomic<Effect.Effect.HandlerMap<any>>
  protected _stackTrace: Atomic<Trace.StackTrace>
  protected _interruptStatus: Atomic<Stack<boolean>>
  protected _interruptedBy = Atomic<ReadonlyArray<FiberId.FiberId>>([])

  constructor(
    readonly effect: Effect.Effect<Fx, E, A>,
    readonly context: EffectContext<Fx> = EffectContext(),
  ) {
    this._remainingOpCount = context.platform.maxOpCount
    this._handlers = Atomic(context.handlers)
    this._stackTrace = Atomic(context.stackTrace)
    this._interruptStatus = Atomic(new Stack(context.interruptStatus))
  }

  readonly id: FiberId.FiberId.Live = FiberId.Live(this.context.platform)

  /**
   * Get the current status of the this Fiber.
   */
  get status(): EffectStatus<E, A> {
    return this._status
  }

  /**
   * Inspect the current state of the Fiber
   */
  get state(): EffectContext<Fx> {
    return {
      platform: this.context.platform,
      handlers: this._handlers.get(),
      stackTrace: this._stackTrace.get(),
      interruptStatus: this._interruptStatus.get().value,
    }
  }

  readonly exit = Effect.lazy(() => {
    if (this._status.tag === 'Done') {
      return Effect.now(this._status.exit)
    }

    const future = Future.Pending<never, never, Exit<E, A>>()

    this.addObserver(flow(Effect.now, Future.complete(future)))

    return Effect.wait(future)
  })

  /**
   * Start the effect. By default, the effect will be started asynchronously.
   * It returns true if the effect was started, false if it was already started
   * as it can only be started once manually. Once started, only cooperative
   * yielding, waiting on Futures, or interruption can change the status of the
   * effect.
   */
  readonly start = (async = true): boolean => {
    if (this._started) {
      return false
    }

    this._current = Maybe.Just(this.effect)

    if (async) {
      this.setTimer(() => this.run())
    } else {
      this.run()
    }

    return true
  }

  /**
   * Add an observer to the effect. Observers will be notified when the effect
   * completes. If the effect has already completed, the observer will be notified using the
   * Platform's timer with a delay of 0.
   */
  readonly addObserver = (observer: Observer<E, A>): Disposable => {
    const status = this._status

    if (status.tag === 'Done') {
      return this.context.platform.timer.setTimer(() => observer(status.exit), Delay(0))
    }

    this._observers.push(observer)

    return Disposable(() => {
      const i = this._observers.indexOf(observer)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  readonly interruptAs = (id: FiberId.FiberId): Effect.Effect<never, never, Exit<E, A>> =>
    Effect.lazy(() => {
      if (this._interruptStatus.get().value) {
        // Immediately interrupt the Fiber
        this.dispose()
        this.continueWithTracedCause(Cause.interrupted(id))
      } else {
        // Record the interrupting FiberId for if/when the interrupt status becomes true again.
        this._interruptedBy.modify((ids) => [Maybe.Nothing, [...ids, id]])
      }

      return this.exit
    })

  // Internals

  protected run() {
    this.running()

    while (Maybe.isJust(this._current)) {
      try {
        this.step(this._current.value)
      } catch (e) {
        this.continueWithTracedCause(Cause.unexpected(e))
      }
    }

    this.suspended()
  }

  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running
    }
  }

  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended
    }
  }

  protected done(exit: Exit<E, A>) {
    this._status = Done(exit)

    if (this._observers.length > 0) {
      this._observers.forEach((observer) => observer(exit))
      this._observers = []
    } else if (isLeft(exit)) {
      this.context.platform.reportFailure(prettyPrint(exit.left, this.context.platform.renderer))
    }

    this._current = Maybe.Nothing

    this.dispose()
  }

  protected step(effect: Effect.Effect<any, any, any>) {
    if (effect.__trace) {
      this.addTrace(Trace.Trace.custom(effect.__trace))
    }

    if (--this._remainingOpCount === 0) {
      return this.yieldNow(effect)
    }

    ;(this[effect.tag] as (e: typeof effect) => void)(effect)
  }

  protected yieldNow(effect: Effect.Effect<any, any, any>) {
    this.resetOpCount()
    this._current = Maybe.Nothing
    this.setTimer(() => {
      this._current = Maybe.Just(effect)
      this.run()
    })
  }

  protected addTrace(trace: Trace.Trace) {
    const trimmed = Trace.getTrimmedTrace(Cause.Empty, this._stackTrace.get())
    const custom = Trace.concat(trace, trimmed)

    this._stackTrace.modify((prev) => [null, prev.push(custom)])

    this.onPop(() => this._stackTrace.modify((prev) => [null, prev.pop() ?? prev]))
  }

  protected Now({ value }: Effect.Effect.Now<any>) {
    this.continueWith(value)
  }

  protected FromLazy({ f }: Effect.Effect.FromLazy<any>) {
    this.continueWith(f())
  }

  protected FromCause({ cause }: Effect.Effect.FromCause<any>) {
    this.continueWithCause(cause)
  }

  protected Lazy({ f }: Effect.Effect.Lazy<any, any, any>) {
    this._current = Maybe.Just(f())
  }

  protected Map({ effect, f }: Effect.Effect.Map<any, any, any, any>) {
    this.pushFrame(MapFrame(f))
    this._current = Maybe.Just(effect)
  }

  protected FlatMap({ effect, f }: Effect.Effect.FlatMap<any, any, any, any, any, any>) {
    this.pushFrame(FlatMapFrame(f))
    this._current = Maybe.Just(effect)
  }

  protected OrElse({ effect, f }: Effect.Effect.OrElse<any, any, any, any, any, any>) {
    this.pushFrame(OrElseFrame(f))
    this._current = Maybe.Just(effect)
  }

  protected Match({
    effect,
    onLeft,
    onRight,
  }: Effect.Effect.Match<any, any, any, any, any, any, any, any, any>) {
    this.pushFrame(MatchFrame(match(onLeft, onRight)))
    this._current = Maybe.Just(effect)
  }

  protected Wait({ future }: Effect.Effect.Wait<any, any, any>) {
    const state = future.state.get()

    if (future.__trace) {
      this.addTrace(Trace.Trace.custom(future.__trace))
    }

    if (state.tag === 'Done') {
      return (this._current = Maybe.Just(state.result))
    }

    this._current = Maybe.Nothing

    const inner = settable()

    inner.add(
      Future.addObserver(future, (effect) => {
        inner.dispose()
        this.yieldNow(effect)
      }),
    )

    inner.add(this.addDisposable(inner))
  }

  protected Yield({ effect }: Effect.Effect.Yield<Effect.Effect.AnyIO>) {
    const tag = effect.tag
    const handler = this._handlers.get().get(tag)

    if (Maybe.isNothing(handler)) {
      throw new Error(`Unable to find handler for ${tag}`)
    }

    if (effect.__trace) {
      this.addTrace(Trace.Trace.custom(effect.__trace))
    }

    this._current = Maybe.Just(handler.value.value.f(effect))
  }

  protected Handle({ effect, handler }: Effect.Effect.Handle<any, any, any, any, any, any, any>) {
    const tag = handler.tag

    this._current = this._handlers.modify((map) => [
      Maybe.Just(effect),
      pipe(
        map.get(tag),
        Maybe.match(
          () => map.set(tag, new Stack(handler)),
          (c) => map.set(tag, c.push(handler)),
        ),
      ),
    ])

    this.onPop(() =>
      this._handlers.modify((map) => [
        Maybe.Nothing,
        pipe(
          map.get(tag),
          Maybe.match(
            () => map,
            (c) => {
              const popped = c.pop()

              return popped === null ? map.remove(tag) : map.set(tag, popped)
            },
          ),
        ),
      ]),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetHandlers(_: Effect.Effect.GetHandlers<any>) {
    this.continueWith(this._handlers.get())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetTrace(_: Effect.Effect.GetTrace) {
    this.continueWith(this._stackTrace.get())
  }

  protected AddTrace({ effect, trace }: Effect.Effect.AddTrace<any, any, any>) {
    this.addTrace(trace)
    this._current = Maybe.Just(effect)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetInterruptStatus(_: Effect.Effect.GetInterruptStatus) {
    this.continueWith(this._interruptStatus.get().value)
  }

  protected SetInterruptStatus({
    effect,
    interruptStatus,
  }: Effect.Effect.SetInterruptStatus<any, any, any>) {
    const isCurrentlyInterruptable = this._interruptStatus.get().value
    this._current = this._interruptStatus.modify((stack) => [
      Maybe.Just(effect),
      stack.push(interruptStatus),
    ])

    if (isCurrentlyInterruptable) {
      this.pushFrame(InterruptFrame)
    }

    this.onPop(() => this._interruptStatus.modify((stack) => [Maybe.Nothing, stack.pop() ?? stack]))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetFiberId(_: Effect.Effect.GetFiberId) {
    this.continueWith(this.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetPlatform(_: Effect.Effect.GetPlatform) {
    this.continueWith(this.context.platform)
  }

  protected continueWith(a: any) {
    let frame = this.popFrame()

    while (frame) {
      const tag = frame.tag

      if (tag === 'FlatMap') {
        this._current = Maybe.Just(frame.f(a))
        return
      } else if (tag === 'Match') {
        this._current = Maybe.Just(frame.f(Right(a)))
        return
      } else if (tag === 'Map') {
        a = frame.f(a)
      } else if (tag === 'Pop') {
        frame.pop()
      } else if (tag === 'Interrupt' && this.interruptNow(Cause.Empty)) {
        return
      }

      frame = this.popFrame()
    }

    this.done(Right(a))
  }

  protected continueWithCause(cause: Cause.Cause<any>) {
    let frame = this.popFrame()

    while (frame) {
      const tag = frame.tag

      if (tag === 'OrElse') {
        this._current = Maybe.Just(frame.f(cause))
        return
      } else if (tag === 'Match') {
        this._current = Maybe.Just(frame.f(Left(cause)))
        return
      } else if (tag === 'Pop') {
        frame.pop()
      } else if (tag === 'Interrupt' && this.interruptNow(cause)) {
        return
      }

      frame = this.popFrame()
    }

    this.done(Left(cause))
  }

  protected continueWithTracedCause(cause: Cause.Cause<any>) {
    const stackTrace = this._stackTrace.get()
    const trimmed = Trace.getTrimmedTrace(cause, stackTrace)
    const current = Trace.getTraceUpTo(
      stackTrace.push(trimmed),
      this.context.platform.maxTraceCount,
    )

    this.continueWithCause(Cause.traced(Trace.concat(trimmed, current))(cause))
  }

  protected pushFrame(frame: EffectFrame): EffectStack {
    if (this._stack === null) {
      return (this._stack = new EffectStack(frame))
    } else {
      return (this._stack = this._stack.push(frame))
    }
  }

  protected popFrame() {
    const frame = this._stack?.value

    this._stack = this._stack?.pop() ?? null

    return frame
  }

  protected setTimer(f: () => void) {
    const inner = settable()

    inner.add(this.context.platform.timer.setTimer(f, Delay(0)))
    inner.add(this.addDisposable(inner))

    return inner
  }

  protected addDisposable(d: Disposable) {
    if (Maybe.isNothing(this._disposable)) {
      const s = settable()

      this._disposable = Maybe.Just(s)

      return s.add(d)
    }

    return this._disposable.value.add(d)
  }

  protected dispose() {
    if (Maybe.isJust(this._disposable)) {
      Maybe.fromJust(this._disposable).dispose()
      this._disposable = Maybe.Nothing
    }
  }

  protected onPop(f: () => void) {
    this.pushFrame(PopFrame(f))
  }

  protected resetOpCount() {
    this._remainingOpCount = this.context.platform.maxOpCount
  }

  protected shouldInterrupt() {
    return this._interruptedBy.get().length > 0
  }

  protected interruptNow(cause: Cause.Cause<any>): boolean {
    const interrupters = this._interruptedBy.get()

    if (!isNonEmpty(interrupters)) {
      return false
    }

    this.continueWithCause(
      concatAllSeqCause(cause)(interrupters.map((id) => Cause.interrupted(id))),
    )

    return true
  }
}

export interface Observer<E, A> {
  (exit: Exit<E, A>): void
}
