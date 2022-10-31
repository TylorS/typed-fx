import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

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
              flow(
                f,
                Effect.foldCauseEffect(
                  (c) => deferred.failCauseSync(c),
                  () => Effect.unit,
                ),
              ),
              (c) => deferred.failCauseSync(c),
              deferred.succeed(undefined),
            ),
          ),
        ),
      ),
      Effect.flatMap((deferred) => deferred.await),
      onEarlyExitFailure(Effect.unit),
      Effect.scoped,
    )
}
