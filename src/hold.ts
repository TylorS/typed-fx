import { Cause, Duration, Effect, Fiber, MutableRef, Option, Scope, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { Multicast, MulticastObserver } from './multicast.js'

export function hold<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return new Hold(fx)
}

export class Hold<R, E, A> extends Multicast<R, E, A> {
  readonly value: MutableRef.MutableRef<Option.Option<A>> = MutableRef.make(Option.none)
  protected _pendingEmitters: Array<readonly [Emitter<unknown, E, A>, A[]]> = []
  protected _scheduledFiber: Fiber.RuntimeFiber<any, any> | undefined

  constructor(readonly fx: Fx<R, E, A>) {
    super(fx)
  }

  run<R2>(emitter: Emitter<R2, E, A>): Effect.Effect<R | R2 | Scope.Scope, never, unknown> {
    if (this.shouldScheduleFlush()) {
      return pipe(
        this.scheduleFlush(emitter),
        Effect.flatMap(() => super.run(emitter)),
      )
    }

    const current = MutableRef.get(this.value)

    if (Option.isSome(current) && this.observers.length === 0) {
      return pipe(
        emitter.emit(current.value),
        Effect.flatMap(() => super.run(emitter)),
      )
    }

    return super.run(emitter)
  }

  emit(value: A) {
    return Effect.suspendSucceed(() => {
      this.addValue(value)

      return pipe(
        this.flushPending(),
        Effect.flatMap(() => super.emit(value)),
      )
    })
  }

  failCause(cause: Cause.Cause<E>) {
    return Effect.suspendSucceed(() =>
      pipe(
        this.flushPending(),
        Effect.flatMap(() => super.failCause(cause)),
      ),
    )
  }

  get end() {
    return Effect.suspendSucceed(() =>
      pipe(
        this.flushPending(),
        Effect.flatMap(() => super.end),
      ),
    )
  }

  protected shouldScheduleFlush() {
    return Option.isSome(MutableRef.get(this.value)) && this.observers.length > 0
  }

  protected scheduleFlush<R>(observer: Emitter<R, E, A>) {
    this._pendingEmitters.push([
      observer,
      pipe(
        this.value,
        MutableRef.get,
        Option.match(
          () => [],
          (a) => [a],
        ),
      ),
    ])

    const interrupt = this._scheduledFiber
      ? this._scheduledFiber.interruptWithFork(Fiber.Id.none)
      : Effect.unit()

    this._scheduledFiber = undefined

    return pipe(
      interrupt,
      Effect.flatMap(() => this.flushPending()),
      Effect.delay(Duration.millis(0)),
      Effect.forkScoped,
      Effect.tap((fiber: Fiber.RuntimeFiber<any, any>) =>
        Effect.sync(() => (this._scheduledFiber = fiber)),
      ),
    )
  }

  protected flushPending() {
    if (this._pendingEmitters.length === 0) {
      return Effect.unit()
    }

    const pendingEmitters = this._pendingEmitters
    this._pendingEmitters = []

    return pipe(
      pendingEmitters,
      Effect.forEachDiscard((pending) =>
        Effect.suspendSucceed(() => {
          const [emitter, values] = pending
          const observer = this.findObserver(emitter)

          if (!observer) {
            return Effect.unit()
          }

          return pipe(
            values,
            Effect.forEachDiscard((value) => this.runEvent(value, observer)),
          )
        }),
      ),
    )
  }

  protected addValue(value: A) {
    pipe(this.value, MutableRef.set(Option.some(value)))

    this._pendingEmitters.forEach(([, values]) => {
      values.push(value)
    })
  }

  protected findObserver(emitter: Emitter<unknown, E, A>): MulticastObserver<E, A> | undefined {
    return this.observers.find((o) => o.emitter === emitter)
  }
}
