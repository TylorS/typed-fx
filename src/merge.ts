import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { refCountDeferred } from './_internal.js'

export function merge<R2, E2, B, E3>(other: Stream<R2, E2, B, E3>) {
  return <R, E, A, E1>(self: Stream<R, E, A, E1>): Stream<R | R2, E | E2, A | B, E1 | E3> =>
    Stream(<R4, E4, C>(sink: Sink<E | E2, A | B, R4, E4, C>) =>
      Effect.gen(function* ($) {
        const deferred = yield* $(refCountDeferred<E1 | E3 | E4, C>(true))

        yield* $(deferred.increment)
        yield* $(deferred.increment)

        yield* $(
          Effect.fork(
            self.run(
              Sink(
                sink.event,
                flow(sink.error, deferred.error),
                pipe(
                  deferred.decrement,
                  Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                ),
              ),
            ),
          ),
        )

        yield* $(
          Effect.fork(
            other.run(
              Sink(
                sink.event,
                flow(sink.error, deferred.error),
                pipe(
                  deferred.decrement,
                  Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                ),
              ),
            ),
          ),
        )

        return yield* $(deferred.await)
      }),
    )
}
