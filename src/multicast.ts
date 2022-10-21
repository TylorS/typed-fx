import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function multicast<R, E, A, E1 = never>(self: Fx<R, E, A, E1>): Fx<R, E, A, E1> {
  return new Multicast(self)
}

class Multicast<R, E, A, E1> implements Fx<R, E, A, E1>, Sink<E, A, any, any, any> {
  protected sinks: Array<[Sink<E, A, any, any, any>, Deferred.Deferred<any, any>]> = []
  protected fiber: Fiber.Fiber<any, any> | undefined

  constructor(readonly self: Fx<R, E, A, E1>) {}

  readonly run: Fx<R, E, A, E1>['run'] = <R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Effect.gen(function* ($) {
      const deferred = yield* $(Deferred.make<E2, B>())

      that.sinks.push([sink, deferred])

      if (that.fiber === undefined) {
        that.fiber = yield* $(Effect.fork(that.self.run(that)))
      }

      return yield* $(deferred.await)
    })
  }

  readonly event: Sink<E, A, any, any, any>['event'] = (a) => {
    const sinks = this.sinks

    return Effect.gen(function* ($) {
      for (const [sink, deferred] of sinks) {
        const exit = yield* $(Effect.exit(sink.event(a)))

        if (exit._tag === 'Failure') {
          deferred.unsafeDone(exit)
        }
      }
    })
  }

  readonly error: Sink<E, A, any, any, any>['error'] = (e) => {
    const sinks = this.sinks

    return Effect.gen(function* ($) {
      for (const [sink, deferred] of sinks) {
        yield* $(pipe(sink.error(e), Effect.intoDeferred(deferred)))
      }
    })
  }

  readonly end: Sink<E, A, any, any, any>['end'] = Effect.suspendSucceed(() => {
    const sinks = this.sinks

    return Effect.gen(function* ($) {
      for (const [sink, deferred] of sinks) {
        yield* $(pipe(sink.end, Effect.intoDeferred(deferred)))
      }
    })
  })
}
