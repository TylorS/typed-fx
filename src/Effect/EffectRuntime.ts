import { Maybe, flow, pipe } from 'hkt-ts'
import { Left, Right, isLeft, match } from 'hkt-ts/Either'

import * as Effect from './Effect.js'
import {
  EffectFrame,
  EffectStack,
  FlatMapFrame,
  MapFrame,
  MatchFrame,
  OrElseFrame,
} from './EffectStack.js'
import { Done, EffectStatus, Running, Suspended } from './EffectStatus.js'
import { Future } from './Future.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import { prettyPrint } from '@/Cause/Renderer.js'
import * as Cause from '@/Cause/index.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'
import * as FiberId from '@/FiberId/FiberId.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'
import * as Trace from '@/Trace/Trace.js'

// TODO: InterruptStatus?

export class EffectRuntime<Fx extends Effect.Effect.AnyIO, E, A> {
  protected _started = false
  protected _observers: Array<Observer<E, A>> = []
  protected _current: Maybe.Maybe<Effect.Effect<any, any, any>> = Maybe.Nothing
  protected _disposable: Maybe.Maybe<Settable> = Maybe.Nothing
  protected _remainingOpCount = AtomicCounter(this.platform.maxOpCount)
  protected _stack: EffectStack | null = null
  protected _handlers: Atomic<Effect.Effect.HandlerMap<any>> = Atomic(this.handlers)
  protected _stackTrace: Atomic<Trace.StackTrace> = Atomic(this.stackTrace)
  protected _status: EffectStatus<E, A> = Suspended

  constructor(
    readonly effect: Effect.Effect<Fx, E, A>,
    readonly platform: Platform = Platform(),
    readonly id: FiberId.FiberId.Live = FiberId.Live(platform),
    readonly handlers: Effect.Effect.HandlerMap<Fx> = ImmutableMap(),
    readonly stackTrace: Trace.StackTrace = Trace.StackTrace(),
  ) {}

  get status(): EffectStatus<E, A> {
    return this._status
  }

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

  readonly addObserver = (observer: Observer<E, A>): Disposable => {
    const status = this._status

    if (status.tag === 'Done') {
      return this.platform.timer.setTimer(() => observer(status.exit), Delay(0))
    }

    this._observers.push(observer)

    return Disposable(() => {
      const i = this._observers.indexOf(observer)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  readonly interruptAs = (id: FiberId.FiberId): Effect.Effect<never, never, Exit<E, A>> => {
    this._current = Maybe.Nothing

    if (Maybe.isJust(this._disposable)) {
      Maybe.fromJust(this._disposable).dispose()
    }

    const future = Future.Pending<never, never, Exit<E, A>>()
    this.addObserver(flow(Effect.now, Future.complete(future)))

    this.continueWithTracedCause(Cause.interrupted(id))

    return Effect.wait(future)
  }

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
      this.platform.reportFailure(prettyPrint(exit.left, this.platform.renderer))
    }

    this._current = Maybe.Nothing

    if (Maybe.isJust(this._disposable)) {
      Maybe.fromJust(this._disposable).dispose()
    }
  }

  protected step(effect: Effect.Effect<any, any, any>) {
    if (decrement(this._remainingOpCount) === 0) {
      return this.yieldNow(effect)
    }

    if (effect.__trace) {
      this.addTrace(effect.__trace)
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

  protected addTrace(trace: string) {
    const trimmed = Trace.getTrimmedTrace(Cause.Empty, this._stackTrace.get())
    const custom = Trace.concat(Trace.Trace.custom(trace), trimmed)

    this._stackTrace.modify((prev) => [null, prev.push(custom)])

    this.onPop(() => this._stackTrace.modify((prev) => [null, prev.pop() ?? prev]))
  }

  protected Now(effect: Effect.Effect.Now<any>) {
    this.continueWith(effect.value)
  }

  protected FromLazy(effect: Effect.Effect.FromLazy<any>) {
    this.continueWith(effect.f())
  }

  protected FromCause(effect: Effect.Effect.FromCause<any>) {
    const { cause } = effect

    if (cause.tag === 'Traced') {
      this.continueWithCause(effect.cause)
    } else {
      this.continueWithTracedCause(cause)
    }
  }

  protected Lazy(effect: Effect.Effect.Lazy<any, any, any>) {
    this._current = Maybe.Just(effect.f())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetTrace(_: Effect.Effect.GetTrace) {
    this.continueWith(this._stackTrace.get())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetPlatform(_: Effect.Effect.GetPlatform) {
    this.continueWith(this.platform)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetFiberId(_: Effect.Effect.GetFiberId) {
    this.continueWith(this.id)
  }

  protected Map(effect: Effect.Effect.Map<any, any, any, any>) {
    this.pushFrame(MapFrame(effect.f))
    this._current = Maybe.Just(effect.effect)
  }

  protected FlatMap(effect: Effect.Effect.FlatMap<any, any, any, any, any, any>) {
    this.pushFrame(FlatMapFrame(effect.f))
    this._current = Maybe.Just(effect.effect)
  }

  protected OrElse(effect: Effect.Effect.OrElse<any, any, any, any, any, any>) {
    this.pushFrame(OrElseFrame(effect.f))
    this._current = Maybe.Just(effect.effect)
  }

  protected Match(effect: Effect.Effect.Match<any, any, any, any, any, any, any, any, any>) {
    this.pushFrame(MatchFrame(match(effect.onLeft, effect.onRight)))
    this._current = Maybe.Just(effect.effect)
  }

  protected Wait(effect: Effect.Effect.Wait<any, any, any>) {
    const future = effect.future
    const state = effect.future.state.get()

    if (future.__trace) {
      this.addTrace(`Future ${future.__trace}`)
    }

    if (state.tag === 'Done') {
      return (this._current = Maybe.Just(state.result))
    }

    const inner = settable()
    inner.add(
      this.addDisposable(
        Future.addObserver(effect.future, (effect) => {
          inner.dispose()
          this.resetOpCount()
          this._current = Maybe.Just(effect)
          this.setTimer(() => this.run())
        }),
      ),
    )
  }

  protected Yield({ effect }: Effect.Effect.Yield<Effect.Effect.AnyIO>) {
    const tag = effect.tag
    const handler = this._handlers.get().get(tag)

    if (Maybe.isNothing(handler)) {
      throw new Error(`Unable to find handler for ${tag}`)
    }

    if (effect.__trace) {
      this.addTrace(effect.__trace)
    }

    this._current = Maybe.Just(handler.value.value.f(effect))
  }

  protected Handle(effect: Effect.Effect.Handle<any, any, any, any, any, any, any>) {
    const tag = effect.handler.tag

    this._current = this._handlers.modify((map) => [
      Maybe.Just(effect.effect),
      pipe(
        map.get(tag),
        Maybe.match(
          () => map.set(tag, new Stack(effect.handler)),
          (c) => map.set(tag, c.push(effect.handler)),
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

  protected continueWith(a: any) {
    let frame = this.popFrame()

    while (frame) {
      if (frame.tag === 'FlatMap') {
        this._current = Maybe.Just(frame.f(a))
        return
      } else if (frame.tag === 'Match') {
        this._current = Maybe.Just(frame.f(Right(a)))
        return
      } else if (frame.tag === 'Map') {
        a = frame.f(a)
      }

      frame = this.popFrame()
    }

    this.done(Right(a))
  }

  protected continueWithCause(cause: Cause.Cause<any>) {
    let frame = this.popFrame()

    while (frame) {
      if (frame.tag === 'OrElse') {
        this._current = Maybe.Just(frame.f(cause))
        return
      } else if (frame.tag === 'Match') {
        this._current = Maybe.Just(frame.f(Left(cause)))
        return
      }

      frame = this.popFrame()
    }

    this.done(Left(cause))
  }

  protected continueWithTracedCause(cause: Cause.Cause<any>) {
    const stackTrace = this._stackTrace.get()
    const trimmed = Trace.getTrimmedTrace(cause, stackTrace)
    const current = Trace.getTraceUpTo(stackTrace.push(trimmed), this.platform.maxTraceCount)

    this.continueWithCause(Cause.traced(Trace.concat(trimmed, current))(cause))
  }

  protected pushFrame(frame: EffectFrame): EffectStack {
    if (this._stack === null) {
      return (this._stack = new EffectStack(frame))
    } else {
      return this._stack.push(frame)
    }
  }

  protected popFrame() {
    const frame = this._stack?.value

    this._stack = this._stack?.pop() ?? null

    return frame
  }

  protected setTimer(f: () => void) {
    const inner = settable()

    inner.add(this.platform.timer.setTimer(f, Delay(0)))
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

  protected onPop(f: () => void) {
    this.pushFrame(
      MatchFrame((exit) => {
        f()

        return Effect.fromExit(exit)
      }),
    )
  }

  protected resetOpCount() {
    this._remainingOpCount.set(this._remainingOpCount.id)
  }
}

export interface Observer<E, A> {
  (exit: Exit<E, A>): void
}
