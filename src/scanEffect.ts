import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'

export function scanEffect<A, B, R2, E2>(seed: A, f: (a: A, B: B) => Effect.Effect<R2, E2, A>) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R | R2, E | E2, A> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, A>) =>
      pipe(
        Ref.makeSynchronized<A>(() => seed),
        Effect.flatMap((ref) =>
          pipe(
            emitter.emit(seed),
            Effect.flatMap(() =>
              fx.run(
                Emitter(
                  (b) =>
                    pipe(
                      ref.updateAndGetEffect((a) => f(a, b)),
                      Effect.foldCauseEffect(emitter.failCause, emitter.emit),
                    ),
                  emitter.failCause,
                  emitter.end,
                ),
              ),
            ),
          ),
        ),
      ),
    )
}
