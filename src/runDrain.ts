import { Deferred, Effect, pipe } from 'effect'

import { Fx } from './Fx.js'
import { onEarlyExitFailure } from './_internal.js'

export function runDrain<R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, void> {
  return pipe(
    Deferred.make<E, void>(),
    Effect.flatMap((deferred) =>
      pipe(
        fx.run({
          emit: Effect.unit,
          failCause: (c) => Deferred.failCause<E>(c)(deferred),
          end: pipe(deferred, Deferred.succeed<void>(undefined)),
        }),
        Effect.forkScoped,
        Effect.zipRight(Deferred.await(deferred)),
        onEarlyExitFailure(Effect.sync(() => Deferred.succeed<void>(undefined)(deferred))),
      ),
    ),
    Effect.scoped,
  )
}
