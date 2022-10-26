import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'

export function snapshot<R2, E2, B, A, R3, E3, C>(
  sampled: Push<R2, E2, B>,
  f: (b: B, a: A) => Effect.Effect<R3, E3, C>,
) {
  return <R, E>(sampler: Push<R, E, A>): Push<R & R2 & R3, E | E2 | E3, C> =>
    snapshot_(sampler, sampled, f)
}

export function sample<R2, E2, B>(sampled: Push<R2, E2, B>) {
  return <R, E, A>(sampler: Push<R, E, A>): Push<R | R2, E | E2, readonly [A, B]> =>
    pipe(
      sampler,
      snapshot(sampled, (b, a) => Effect.succeed([a, b])),
    )
}

export function snapshot_<R, E, A, R2, E2, B, R3, E3, C>(
  sampler: Push<R, E, A>,
  sampled: Push<R2, E2, B>,
  f: (b: B, a: A) => Effect.Effect<R3, E3, C>,
): Push<R | R2 | R3, E | E2 | E3, C> {
  return Push((emitter) =>
    pipe(
      Ref.makeRef<Maybe.Maybe<B>>(() => Maybe.none),
      Effect.tap((ref) =>
        sampled.run(Emitter(flow(Maybe.some, ref.set), emitter.failCause, emitter.end)),
      ),
      Effect.flatMap((ref) =>
        sampler.run(
          Emitter(
            (a) =>
              pipe(
                ref.get,
                Effect.flatMap(
                  Maybe.fold(
                    () => Effect.unit,
                    (b) => pipe(f(b, a), Effect.foldCauseEffect(emitter.failCause, emitter.emit)),
                  ),
                ),
              ),
            emitter.failCause,
            emitter.end,
          ),
        ),
      ),
    ),
  )
}
