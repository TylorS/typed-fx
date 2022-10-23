import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred } from './_internal.js'

export function during<R2, E2, R3, E3, B, E4, E5>(signal: Fx<R2, E2, Fx<R3, E3, B, E4>, E5>) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2 | R3, E, A, E1 | E2 | E3 | E4 | E5> =>
    Fx(<R6, E6, C>(sink: Sink<E, A, R6, E6, C>) =>
      Effect.gen(function* ($) {
        const ref = yield* $(makeRef(() => false))
        const deferred = yield* $(refCountDeferred<E1 | E2 | E3 | E4 | E5 | E6, C>(true))

        yield* $(
          Effect.fork(
            signal.run(
              Sink(
                (endSignal) =>
                  pipe(
                    ref.set(true),
                    Effect.zipRight(
                      endSignal.run(
                        Sink(
                          () => deferred.endIfComplete(sink.end),
                          flow(Effect.failCause, deferred.error),
                          deferred.endIfComplete(sink.end),
                        ),
                      ),
                    ),
                  ),
                flow(Effect.failCause, deferred.error),
                deferred.endIfComplete(sink.end),
              ),
            ),
          ),
        )

        yield* $(
          Effect.fork(
            fx.run(
              Sink(
                (a) =>
                  pipe(
                    ref.get,
                    Effect.flatMap((started) => (started ? sink.event(a) : Effect.unit)),
                  ),
                flow(sink.error, deferred.error),
                deferred.endIfComplete(sink.end),
              ),
            ),
          ),
        )
        return yield* $(deferred.await)
      }),
    )
}
