import type { Context } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import type { RuntimeFiber } from "@effect/io/Fiber"
import type { Scope } from "@effect/io/Scope"

import { methodWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"
import { asap } from "../RefCounter"

export const multicast: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A> = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> => new MulticastFx(fx, "Multicast").traced(trace)
)

export class MulticastFx<R, E, A, Tag extends string> extends BaseFx<R, E, A> implements Sink<never, E, A> {
  protected observers: Array<MulticastObserver<any, E, A>> = []
  protected fiber: RuntimeFiber<never, unknown> | undefined

  constructor(readonly fx: Fx<R, E, A>, readonly _tag: Tag) {
    super()
    this.event = this.event.bind(this)
    this.error = this.error.bind(this)
  }

  run<R2>(sink: Sink<R2, E, A>): Effect.Effect<R | R2 | Scope, never, void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const { fx, observers } = this

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const context = yield* $(Effect.context<R | R2>())
      const observer: MulticastObserver<R2, E, A> = {
        sink,
        context,
        deferred
      }

      if (observers.push(observer) === 1) {
        that.fiber = yield* $(pipe(fx.run(that), Effect.scheduleForked(asap)))
      }

      yield* $(Deferred.await(deferred))

      if (observers.length === 0) {
        yield* $(that.cleanup())
      }
    })
  }

  event(a: A) {
    return Effect.suspendSucceed(() =>
      Effect.forEachDiscard(this.observers.slice(), (observer) => this.runEvent(a, observer))
    )
  }

  error(cause: Cause<E>) {
    return Effect.suspendSucceed(() =>
      pipe(
        Effect.forEachParDiscard(this.observers.slice(), (observer) => this.runError(cause, observer)),
        Effect.tap(() => this.cleanup())
      )
    )
  }

  end(): Effect.Effect<never, never, void> {
    return Effect.suspendSucceed(() =>
      pipe(
        Effect.forEachParDiscard(this.observers.slice(), (observer) => this.runEnd(observer)),
        Effect.tap(() => this.cleanup())
      )
    )
  }

  protected runEvent(a: A, observer: MulticastObserver<any, E, A>) {
    return pipe(observer.sink.event(a), Effect.provideContext(observer.context))
  }

  protected runError(cause: Cause<E>, observer: MulticastObserver<any, E, A>) {
    return pipe(
      observer.sink.error(cause),
      Effect.provideContext(observer.context),
      Effect.tap(() => Effect.sync(() => this.removeObserver(observer))),
      Effect.intoDeferred(observer.deferred)
    )
  }

  protected runEnd(observer: MulticastObserver<any, E, A>) {
    return pipe(
      observer.sink.end(),
      Effect.provideContext(observer.context),
      Effect.tap(() => Effect.sync(() => this.removeObserver(observer))),
      Effect.intoDeferred(observer.deferred)
    )
  }

  protected removeObserver(observer: MulticastObserver<any, E, A>) {
    const { observers } = this
    const index = observers.indexOf(observer)

    if (index > -1) {
      observers.splice(index, 1)
    }
  }

  protected cleanup() {
    return this.fiber
      ? pipe(
        Fiber.interrupt(this.fiber),
        Effect.tap(() => Effect.sync(() => (this.fiber = undefined)))
      )
      : Effect.unit()
  }
}

export interface MulticastObserver<R, E, A> {
  readonly sink: Sink<R, E, A>
  readonly context: Context<R>
  readonly deferred: Deferred.Deferred<never, unknown>
}