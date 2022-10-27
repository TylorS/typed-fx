import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { AtomicReference } from '@tsplus/stdlib/data/AtomicReference'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'

export function snapshot<R2, E2, B, A, R3, E3, C>(sampled: Push<R2, E2, B>, f: (b: B, a: A) => C) {
  return <R, E>(sampler: Push<R, E, A>): Push<R & R2 & R3, E | E2 | E3, C> =>
    snapshot_(sampler, sampled, f)
}

export function sample<R2, E2, B>(sampled: Push<R2, E2, B>) {
  return <R, E, A>(sampler: Push<R, E, A>): Push<R | R2, E | E2, readonly [A, B]> =>
    pipe(
      sampler,
      snapshot(sampled, (b, a) => [a, b]),
    )
}

function snapshot_<R, E, A, R2, E2, B, R3, E3, C>(
  sampler: Push<R, E, A>,
  sampled: Push<R2, E2, B>,
  f: (b: B, a: A) => C,
): Push<R | R2 | R3, E | E2 | E3, C> {
  return Push((emitter) =>
    pipe(
      Effect.sync(() => new AtomicReference<Maybe.Maybe<B>>(Maybe.none)),
      Effect.tap((ref) =>
        Effect.forkScoped(
          sampled.run(
            Emitter(
              (a) => Effect.sync(() => ref.set(Maybe.some(a))),
              emitter.failCause,
              Effect.unit,
            ),
          ),
        ),
      ),
      Effect.flatMap((ref) =>
        sampler.run(
          Emitter(
            (a) =>
              pipe(
                ref.get,
                Maybe.fold(
                  () => (console.log('no ref'), Effect.unit),
                  (b) => emitter.emit(f(b, a)),
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
