import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Push<R, E, A> {
  return Push((emitter) =>
    pipe(
      effect,
      Effect.foldCauseEffect(emitter.failCause, flow(emitter.emit, Effect.zipRight(emitter.end))),
    ),
  )
}

export const succeed = flow(Effect.succeed, fromEffect)
