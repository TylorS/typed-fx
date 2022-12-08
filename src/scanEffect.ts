import { Effect, Ref, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'

export function scanEffect<A, B, R2, E2>(seed: A, f: (a: A, B: B) => Effect.Effect<R2, E2, A>) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R | R2, E | E2, A> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, A>) =>
      pipe(
        Ref.SynchronizedRef.make<A>(seed),
        Effect.flatMap((ref) =>
          pipe(
            emitter.emit(seed),
            Effect.flatMap(() =>
              fx.run(
                Emitter(
                  (b) =>
                    pipe(
                      ref,
                      Ref.SynchronizedRef.updateAndGetEffect((a) => f(a, b)),
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
