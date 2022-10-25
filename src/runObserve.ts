import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'

export function runObserve<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Effect.Effect<R | R2, E | E2, void> =>
    pipe(
      Deferred.make<E, void>(),
      Effect.flatMap((deferred) =>
        pipe(
          push.run({
            emit: f,
            failCause: (e) => deferred.failCause(() => e),
            end: deferred.succeed(undefined),
          }),
          Effect.zipRight(deferred.await),
        ),
      ),
      Effect.scoped,
    )
}
