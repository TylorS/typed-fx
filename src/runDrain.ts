import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'

export function runDrain<R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, void> {
  return pipe(
    Deferred.make<E, void>(),
    Effect.flatMap((deferred) =>
      pipe(
        fx.run({
          emit: () => Effect.unit,
          failCause: (c) => deferred.failCauseSync(c),
          end: deferred.succeed(undefined),
        }),
        Effect.forkScoped,
        Effect.zipRight(deferred.await),
      ),
    ),
    Effect.scoped,
  )
}
