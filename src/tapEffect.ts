import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'

export const tapEffect =
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) =>
  <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    Fx((emitter) =>
      fx.run(
        Emitter(
          (a) =>
            pipe(
              a,
              f,
              Effect.foldCauseEffect(emitter.failCause, () => emitter.emit(a)),
            ),
          emitter.failCause,
          emitter.end,
        ),
      ),
    )

export const tap = <A>(f: (a: A) => unknown) => tapEffect((a: A) => Effect.sync(() => f(a)))
