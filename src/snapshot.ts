import { Effect, MutableRef, Option, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'

export function snapshot<R2, E2, B, A, C>(sampled: Fx<R2, E2, B>, f: (b: B, a: A) => C) {
  return <R, E>(sampler: Fx<R, E, A>): Fx<R | R2, E | E2, C> => snapshot_(sampler, sampled, f)
}

export function sample<R2, E2, B>(sampled: Fx<R2, E2, B>) {
  return <R, E, A>(sampler: Fx<R, E, A>): Fx<R | R2, E | E2, readonly [A, B]> =>
    snapshot_(sampler, sampled, (b, a) => [a, b])
}

function snapshot_<R, E, A, R2, E2, B, C>(
  sampler: Fx<R, E, A>,
  sampled: Fx<R2, E2, B>,
  f: (b: B, a: A) => C,
): Fx<R | R2, E | E2, C> {
  return Fx((emitter) =>
    pipe(
      Effect.sync(() => MutableRef.make<Option.Option<B>>(Option.none)),
      Effect.tap((ref) =>
        Effect.forkScoped(
          sampled.run(
            Emitter(
              (a) => Effect.sync(() => pipe(ref, MutableRef.set(Option.some(a)))),
              emitter.failCause,
              Effect.unit(),
            ),
          ),
        ),
      ),
      Effect.flatMap((ref) =>
        sampler.run(
          Emitter(
            (a) =>
              pipe(
                ref,
                MutableRef.get,
                Option.match(Effect.unit, (b) => emitter.emit(f(b, a))),
              ),
            emitter.failCause,
            emitter.end,
          ),
        ),
      ),
    ),
  )
}
