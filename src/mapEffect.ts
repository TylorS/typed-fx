import * as Effect from '@effect/core/io/Effect'
import { flow } from '@fp-ts/data/Function'

import { Push } from './Push.js'

export const mapEffect =
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) =>
  <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    Push((emitter) =>
      push.run({
        event: flow(f, Effect.foldCauseEffect(emitter.error, emitter.event)),
        error: emitter.error,
        end: emitter.end,
      }),
    )
