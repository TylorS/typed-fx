import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from 'node_modules/@fp-ts/data/Function.js'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Stream<R, E, A> {
  return new FromEffectStream(effect)
}

export class FromEffectStream<R, E, A> implements Stream<R, E, A> {
  constructor(readonly effect: Effect.Effect<R, E, A>) {}

  run<R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E2, B> {
    return pipe(
      this.effect,
      Effect.foldCauseEffect(sink.error, flow(sink.event, Effect.zipRight(sink.end))),
    )
  }
}
