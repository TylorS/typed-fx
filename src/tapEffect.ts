import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'

export const tapEffect =
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) =>
  <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, A> =>
    Push((emitter) =>
      push.run(
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
