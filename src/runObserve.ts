import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'

export function runObserve<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Effect.Effect<R | R2, E | E2, void> =>
    pipe(
      Deferred.make<E | E2, void>(),
      Effect.tap((deferred) =>
        push.run(
          Emitter(
            flow(
              f,
              Effect.foldCauseEffect(deferred.failCauseSync, () => Effect.unit),
            ),
            deferred.failCauseSync,
            deferred.succeed(undefined),
          ),
        ),
      ),
      Effect.flatMap((deferred) => deferred.await),
      Effect.scoped,
    )
}
