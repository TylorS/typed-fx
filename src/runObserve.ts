import { Deferred, Effect, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { onEarlyExitFailure } from './_internal.js'

export function runObserve<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Effect.Effect<R | R2, E | E2, void> =>
    pipe(
      Deferred.make<E | E2, void>(),
      Effect.tap((deferred) =>
        Effect.forkScoped(
          fx.run(
            Emitter(
              (a: A) =>
                pipe(
                  a,
                  f,
                  Effect.foldCauseEffect(
                    (c) => Deferred.failCause<E | E2>(c)(deferred),
                    Effect.unit,
                  ),
                ),
              (c) => Deferred.failCause<E | E2>(c)(deferred),
              Deferred.succeed<void>(undefined)(deferred),
            ),
          ),
        ),
      ),
      Effect.flatMap((deferred) => Deferred.await(deferred)),
      onEarlyExitFailure(Effect.unit()),
      Effect.scoped,
    )
}
