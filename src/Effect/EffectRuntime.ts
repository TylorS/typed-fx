import { Maybe, constVoid, flow, pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import { concatAll } from 'hkt-ts/Typeclass/Associative'
import { NonNegativeInteger } from 'hkt-ts/number'

import * as Effect from './Effect.js'
import { EffectContext } from './EffectContext.js'
import { EffectObservers, Observer } from './EffectObservers.js'
import { EffectRefs } from './EffectRefs.js'
import { EffectScope } from './EffectScope.js'
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
import { Fiber } from './Fiber.js'
import { Future } from './Future.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { prettyPrint } from '@/Cause/Renderer.js'
import * as Cause from '@/Cause/index.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import * as FiberId from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'
import * as Trace from '@/Trace/Trace.js'

// TODO: Allow Running Arbitrary Effects within the Runtime
// TODO: Supervision

const CauseSeqAssoc = Cause.makeSequentialAssociative<any>()
const concatAllSeqCause = concatAll(CauseSeqAssoc)

export class EffectRuntime<Fx extends Effect.Effect.AnyIO, E, A> implements Fiber<E, A> {
  // Fully internalized state
  protected _started = false // Whether or not this fiber has been manually started yet
  protected _current: Maybe.Maybe<Effect.Effect<any, any, any>> = Maybe.Nothing // The current Effect to process
  protected _stack: EffectStack | null = null // The control flow for returning Exit values
  protected _observers = new EffectObservers<E, A>() // The observers of this Fiber's exit value.
  protected _disposable: Maybe.Maybe<Settable> = Maybe.Nothing // Any resources that should be cleaned up after the effect is complete.
  protected _remainingOpCount: NonNegativeInteger // How many operations remain until the Fiber yields cooperatively
  protected _handlers: Atomic<Effect.Effect.HandlerMap<any>> // The current IO handlers
  protected _stackTrace: Atomic<Trace.StackTrace> // The current StackTrace
  protected _interruptStatus: Atomic<Stack<boolean>> // The current interruptStatus
  protected _interruptedBy = Atomic<ReadonlyArray<FiberId.FiberId>>([]) // List of all interrupting Fibers
  protected _scope: EffectScope<E, A> = EffectScope((exit) => this.done(exit))

  // Sampled via EffectRuntime.status
  protected _status: FiberStatus<E, A> = Suspended

  constructor(
    readonly effect: Effect.Effect<Fx, E, A>,
    readonly effectContext: EffectContext = EffectContext(),
    readonly handlers: Effect.Effect.HandlerMap<Fx> = ImmutableMap(),
  ) {
    this._remainingOpCount = effectContext.platform.maxOpCount
    this._handlers = Atomic(handlers)
    this._stackTrace = Atomic(effectContext.stackTrace)
    this._interruptStatus = Atomic(new Stack(effectContext.interruptStatus))
  }

  readonly tag = 'Live'

  /**
   * The ID of the current Fiber
   */
  readonly id: FiberId.FiberId.Live = FiberId.Live(this.effectContext.platform)

  /**
   * Get the current status of the this Fiber.
   */
  get status(): FiberStatus<E, A> {
    return this._status
  }

  get context(): EffectContext {
    return {
      ...this.effectContext,
      stackTrace: this._stackTrace.get(),
      interruptStatus: this._interruptStatus.get().value,
    }
  }

  /**
   * Await the exit value of this Fiber.
   */
  readonly exit = Effect.lazy(() => {
    if (this._status.tag === 'Done') {
      return Effect.now(this._status.exit)
    }

    const future = Future.Pending<never, never, Exit<E, A>>()

    this.addObserver(flow(Effect.now, Future.complete(future)))

    return Effect.wait(future)
  })

  /**
   * Get the current Trace
   */
  readonly trace = Effect.fromLazy(() =>
    Trace.getTraceUpTo(this._stackTrace.get(), this.effectContext.platform.maxTraceCount),
  )

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
      this.setTimer(() => this.eventLoop())
    } else {
      this.eventLoop()
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
      return this.effectContext.platform.timer.setTimer(() => observer(status.exit), Delay(0))
    }

    return this._observers.addObserver(observer)
  }

  /**
   * Interrupt the Fiber. This will interrupt the effect and all of its children as soon as
   * possible. If the effect is marked as interruptible, it will be interrupted immediately.
   * If the effect is not interruptible, it will be interrupted as soon as it becomes
   * interruptable, if ever.
   */
  readonly interruptAs = (id: FiberId.FiberId): Effect.Effect.Of<Exit<E, A>> =>
    Effect.lazy(() => {
      if (this._interruptStatus.get().value) {
        this.yieldNow(Effect.fromCause(Cause.interrupted(id)))
      } else {
        // Record the interrupting FiberId for if/when the interrupt status becomes true again.
        this._interruptedBy.modify((ids) => [Maybe.Nothing, [...ids, id]])
      }

      return this.exit
    })

  // Internals

  protected eventLoop() {
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
    this.dispose()

    if (this._observers.isNonEmpty()) {
      this._observers.notifyExit(exit)
    } else if (Either.isLeft(exit)) {
      this.effectContext.platform.reportFailure(
        prettyPrint(exit.left, this.effectContext.platform.renderer),
      )
    }
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

  protected Now({ value }: Effect.Effect.Now<any>) {
    this.continueWith(value)
  }

  protected FromLazy({ f }: Effect.Effect.FromLazy<any>) {
    this.continueWith(f())
  }

  protected Lazy({ f }: Effect.Effect.Lazy<any, any, any>) {
    this._current = Maybe.Just(f())
  }

  protected FromCause({ cause }: Effect.Effect.FromCause<any>) {
    this.continueWithCause(cause)
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
    this.pushFrame(MatchFrame(Either.match(onLeft, onRight)))
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

    this.addDisposable((remove) =>
      Future.addObserver(future, (effect) => {
        remove()
        this.yieldNow(effect)
      }),
    )
  }

  protected Both({ left, right }: Effect.Effect.Both<any, any, any, any, any, any, any>) {
    const ctx = this.context
    const l = new EffectRuntime(left, ctx, this._handlers.get())
    const r = new EffectRuntime(right, ctx, this._handlers.get())
    const future = runBoth(l, r)

    this._current = Maybe.Just(Effect.wait(future))
  }

  protected Either({ left, right }: Effect.Effect.Either<any, any, any, any, any, any, any>) {
    const ctx = this.context
    const l = new EffectRuntime(left, ctx, this._handlers.get())
    const r = new EffectRuntime(right, ctx, this._handlers.get())
    const future = runEither(l, r)

    this._current = Maybe.Just(Effect.wait(future))
  }

  protected Fork({ effect, params }: Effect.Effect.Fork<any, any, any>) {
    const child = new EffectRuntime(
      effect,
      {
        platform: params?.platform ?? this.effectContext.platform.fork(),
        refs: params?.refs ?? this.effectContext.refs.fork(),
        stackTrace: params?.stackTrace ?? this._stackTrace.get(),
        interruptStatus: params?.interruptStatus ?? this._interruptStatus.get().value,
        parent: params?.parent ?? Maybe.Just(this.effectContext),
      },
      this._handlers.get(),
    )
    const forkScope = params?.forkScope ?? this._scope

    forkScope.addChild(child)
    child.addDisposable(() => Disposable(() => forkScope.removeChild(child)))
    child.start(params?.async)
    this.continueWith(child)
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
  protected GetFiberChildren(_: Effect.Effect.GetFiberChildren) {
    this.continueWith(this._scope.children)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetPlatform(_: Effect.Effect.GetPlatform) {
    this.continueWith(this.effectContext.platform)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetEffectRefs(_: Effect.Effect.GetEffectRefs) {
    this.continueWith(this.effectContext.refs)
  }

  protected EffectRefLocally({
    effect,
    ref,
    value,
  }: Effect.Effect.EffectRefLocally<any, any, any, any, any, any>) {
    const refs = this.effectContext.refs
    EffectRefs.pushLocal(refs, ref, value)
    this.onPop(() => EffectRefs.popLocal(refs, ref))
    this._current = Maybe.Just(effect)
  }

  // #region Effect Stack Management

  protected continueWith(a: any) {
    let frame = this.popFrame()

    while (frame) {
      const tag = frame.tag

      if (tag === 'FlatMap') {
        return (this._current = Maybe.Just(frame.f(a)))
      } else if (tag === 'Match') {
        return (this._current = Maybe.Just(frame.f(Either.Right(a))))
      } else if (tag === 'Map') {
        a = frame.f(a)
      } else if (tag === 'Pop') {
        frame.pop()
      } else if (tag === 'Interrupt' && this.interruptNow(Cause.Empty)) {
        return
      }

      frame = this.popFrame()
    }

    if (!this._scope.close(Either.Right(a))) {
      this.interruptChildren()
    }
  }

  protected continueWithCause(cause: Cause.Cause<any>) {
    let frame = this.popFrame()

    while (frame) {
      const tag = frame.tag

      if (tag === 'OrElse') {
        this._current = Maybe.Just(frame.f(cause))
        return
      } else if (tag === 'Match') {
        this._current = Maybe.Just(frame.f(Either.Left(cause)))
        return
      } else if (tag === 'Pop') {
        frame.pop()
      } else if (tag === 'Interrupt' && this.interruptNow(cause)) {
        return
      }

      frame = this.popFrame()
    }

    if (!this._scope.close(Either.Left(cause))) {
      this.interruptChildren()
    }
  }

  protected continueWithTracedCause(cause: Cause.Cause<any>) {
    const stackTrace = this._stackTrace.get()
    const trimmed = Trace.getTrimmedTrace(cause, stackTrace)
    const current = Trace.getTraceUpTo(
      stackTrace.push(trimmed),
      this.effectContext.platform.maxTraceCount,
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

  protected onPop(f: () => void) {
    this.pushFrame(PopFrame(f))
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

  protected interruptChildren() {
    const interrupts = this._scope.children.map((child) => child.interruptAs(this.id))

    if (isNonEmpty(interrupts)) {
      const [f, ...rest] = interrupts
      this._current = Maybe.Just(
        rest.reduce((acc, x) => Effect.both(x)(acc), f as Effect.Effect<any, any, any>),
      )
    }
  }

  // #endregion

  protected yieldNow(effect: Effect.Effect<any, any, any>) {
    this._current = Maybe.Nothing
    this.setTimer(() => {
      this._current = Maybe.Just(effect)
      this.eventLoop()
    })
    this.resetOpCount()
  }

  protected addTrace(trace: Trace.Trace) {
    const trimmed = Trace.getTrimmedTrace(Cause.Empty, this._stackTrace.get())
    const custom = Trace.concat(trace, trimmed)

    this._stackTrace.modify((prev) => [null, prev.push(custom)])

    this.onPop(() => this._stackTrace.modify((prev) => [null, prev.pop() ?? prev]))
  }

  protected setTimer(f: () => void) {
    return this.addDisposable((remove) => {
      return this.effectContext.platform.timer.setTimer(() => {
        remove()
        f()
      }, Delay(0))
    })
  }

  protected addDisposable(f: (remove: () => void) => Disposable) {
    const s = pipe(
      this._disposable,
      Maybe.getOrElse(() => {
        const s = settable()

        this._disposable = Maybe.Just(s)

        return s
      }),
    )

    const inner = settable()

    inner.add(f(() => inner.dispose()))
    inner.add(s.add(inner))

    return inner
  }

  protected dispose() {
    this._current = Maybe.Nothing

    if (Maybe.isJust(this._disposable)) {
      Maybe.fromJust(this._disposable).dispose()
      this._disposable = Maybe.Nothing
    }
  }

  protected resetOpCount() {
    this._remainingOpCount = this.effectContext.platform.maxOpCount
  }
}

function runBoth(
  left: EffectRuntime<any, any, any>,
  right: EffectRuntime<any, any, any>,
): Future<any, any, any> {
  const future = Future.Pending<any, any, any>()

  let leftExit: Maybe.Maybe<any> = Maybe.Nothing
  let rightExit: Maybe.Maybe<any> = Maybe.Nothing

  const cancel = (side: 'l' | 'r') =>
    side === 'l' ? right.interruptAs(left.id) : left.interruptAs(right.id)

  const done = (side: 'l' | 'r') => (exit: Exit<any, any>) => {
    if (Either.isLeft(exit)) {
      return Future.complete(future)(
        pipe(
          cancel(side),
          Effect.flatMap(() => Effect.fromCause(exit.left)),
        ),
      )
    }

    if (side === 'l') {
      leftExit = Maybe.Just(exit.right)
    } else {
      rightExit = Maybe.Just(exit.right)
    }

    pipe(
      Maybe.tuple(leftExit, rightExit),
      Maybe.match(constVoid, ([l, r]) => Future.complete(future)(Effect.now([l, r]))),
    )
  }

  left.addObserver(done('l'))
  right.addObserver(done('r'))

  left.start(false)
  right.start(false)

  return future
}

function runEither(
  left: EffectRuntime<any, any, any>,
  right: EffectRuntime<any, any, any>,
): Future<any, any, any> {
  const future = Future.Pending<any, any, any>()

  const done = (side: 'l' | 'r') => (exit: Exit<any, any>) =>
    Future.complete(future)(
      pipe(
        side === 'l' ? right.interruptAs(left.id) : left.interruptAs(right.id),
        Effect.flatMap(() =>
          pipe(
            exit,
            Either.map<any, any>(side === 'l' ? Either.Left : Either.Right),
            Effect.fromExit,
          ),
        ),
      ),
    )

  left.addObserver(done('l'))
  right.addObserver(done('r'))

  left.start(false)
  right.start(false)

  return future
}
