import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'

export function fromFxEffect<R, E, R2, E2, A>(
  effectFx: Effect.Effect<R, E, Fx<R2, E2, A>>,
): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      effectFx,
      Effect.foldCauseEffect(emitter.failCause, (fx) => fx.run(emitter)),
    ),
  )
}
