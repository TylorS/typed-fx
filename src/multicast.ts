import * as Cause from '@effect/core/io/Cause'
import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'
import { Env } from '@tsplus/stdlib/service/Env'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { asap } from './_internal.js'

export function multicast<R, E, A, E1 = never>(self: Fx<R, E, A, E1>): Fx<R, E, A, E1> {
  return new Multicast(self)
}

export type MulticastObserver<E, A> = readonly [
  Sink<E, A, any, any, any>,
  Env<any>,
  Deferred.Deferred<any, any>,
]

export class Multicast<R, E, A, E1> implements Fx<R, E, A, E1>, Sink<E, A, any, any, any> {
  protected sinks: Array<MulticastObserver<E, A>> = []
  protected fiber: Fiber.Fiber<any, any> | undefined

  constructor(readonly fx: Fx<R, E, A, E1>) {
    this.run = this.run.bind(this)
    this.event = this.event.bind(this)
    this.error = this.error.bind(this)
    this.runEvent = this.runEvent.bind(this)
    this.runError = this.runError.bind(this)
    this.runEnd = this.runEnd.bind(this)
  }

  run<R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E1 | E2, B> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Effect.gen(function* ($) {
      const env = yield* $(Effect.environment<R | R2>())
      const deferred = yield* $(Deferred.make<E2, B>())

      that.sinks.push([sink, env, deferred])

      if (!that.fiber) {
        that.fiber = yield* $(Effect.fork(Effect.schedule(asap)(that.fx.run(that))))
      }

      return yield* $(deferred.await)
    })
  }

  event(a: A) {
    return Effect.forEachDiscard(this.sinks.slice(), (o) => this.runEvent(a, o))
  }

  error(e: Cause.Cause<E>): Effect.Effect<never, any, void> {
    return pipe(
      Effect.forEachDiscard(this.sinks.slice(), (o) => this.runError(e, o)),
      Effect.tap(() => Effect.sync(() => (this.fiber = undefined))),
    )
  }

  public get end(): Sink<E, A, any, any, any>['end'] {
    return pipe(
      Effect.forEachDiscard(this.sinks.slice(), (o) => this.runEnd(o)),
      Effect.tap(() => Effect.sync(() => (this.fiber = undefined))),
    )
  }

  protected runEvent(a: A, observer: MulticastObserver<E, A>) {
    return pipe(
      observer[0].event(a),
      Effect.provideEnvironment(observer[1]),
      Effect.onError((c) => (Cause.isEmpty(c) ? Effect.unit : this.runError(c, observer))),
    )
  }

  protected runError(e: Cause.Cause<E>, observer: MulticastObserver<E, A>) {
    this.sinks.splice(this.sinks.indexOf(observer), 1)

    return pipe(
      observer[0].error(e),
      Effect.intoDeferred(observer[2]),
      Effect.provideEnvironment(observer[1]),
    )
  }

  protected runEnd(observer: MulticastObserver<E, A>) {
    this.sinks.splice(this.sinks.indexOf(observer), 1)

    return pipe(
      observer[0].end,
      Effect.intoDeferred(observer[2]),
      Effect.provideEnvironment(observer[1]),
    )
  }
}
