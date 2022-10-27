import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'

export const mapEffect =
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) =>
  <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx((emitter) =>
      fx.run(
        Emitter(
          flow(f, Effect.foldCauseEffect(emitter.failCause, emitter.emit)),
          emitter.failCause,
          emitter.end,
        ),
      ),
    )
