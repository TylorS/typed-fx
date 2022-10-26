import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'

export function runDrain<R, E, A>(push: Push<R, E, A>): Effect.Effect<R | Scope, E, void> {
  return pipe(
    Deferred.make<E, void>(),
    Effect.flatMap((deferred) =>
      pipe(
        push.run({
          emit: () => Effect.unit,
          failCause: deferred.failCauseSync,
          end: deferred.succeed(undefined),
        }),
        Effect.zipRight(deferred.await),
      ),
    ),
  )
}
