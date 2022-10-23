import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred } from './_internal.js'

export function since<R2, E2, B, E3>(signal: Fx<R2, E2, B, E3>) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E, A, E1 | E2 | E3> =>
    Fx(<R4, E4, C>(sink: Sink<E, A, R4, E4, C>) =>
      Effect.gen(function* ($) {
        const ref = yield* $(makeRef(() => false))
        const deferred = yield* $(refCountDeferred<E1 | E2 | E3 | E4, C>(true))

        yield* $(
          Effect.fork(
            signal.run(
              Sink(
                () => ref.set(true),
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
