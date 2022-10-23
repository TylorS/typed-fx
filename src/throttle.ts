import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import * as Schedule from '@effect/core/io/Schedule'
import { flow, pipe } from '@fp-ts/data/Function'
import { Duration } from '@tsplus/stdlib/data/Duration'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred } from './_internal.js'

export function throttle(duration: Duration) {
  return <R, E, A, E1>(fx: Fx<R, E, A>): Fx<R, E, A, E1> =>
    Fx(
      <R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E1 | E2, B> =>
        Effect.gen(function* ($) {
          const ref = yield* $(
            Ref.makeSynchronized<Fiber.Fiber<unknown, unknown> | null>(() => null),
          )
          const deferred = yield* $(refCountDeferred<E1 | E2, B>(true))

          return yield* $(
            fx.run(
              Sink<E, A, R | R2, E1 | E2, B>(
                (a) =>
                  ref.updateEffect((current) =>
                    Effect.gen(function* (_) {
                      if (current) {
                        return current
                      }

                      yield* $(deferred.increment)

                      return yield* _(
                        pipe(
                          sink.event(a),
                          Effect.schedule(Schedule.delayed(() => duration)(Schedule.once)),
                          Effect.tap(() =>
                            pipe(
                              ref.set(null),
                              Effect.zipRight(deferred.decrement),
                              Effect.zipRight(deferred.endIfComplete(sink.end)),
                            ),
                          ),
                          Effect.uninterruptible,
                          Effect.fork,
                        ),
                      )
                    }),
                  ),
                flow(sink.error, deferred.error, Effect.zipRight(deferred.await)),
                pipe(sink.end, deferred.endIfComplete, Effect.zipRight(deferred.await)),
              ),
            ),
          )
        }),
    )
}
