import { Effect, Option, Ref, pipe } from 'effect'

import { Fx } from './Fx.js'
import { runObserve } from './runObserve.js'

export function runReduce<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(fx: Fx<R, E, B>): Effect.Effect<R, E, A> => {
    return runReduce_(fx, seed, f)
  }
}

export function runFilterReduce<A, B>(seed: A, f: (a: A, b: B) => Option.Option<A>) {
  return <R, E>(fx: Fx<R, E, B>): Effect.Effect<R, E, A> => {
    return runFilterReduce_(fx, seed, f)
  }
}

function runReduce_<R, E, A, B>(
  fx: Fx<R, E, B>,
  seed: A,
  f: (a: A, b: B) => A,
): Effect.Effect<R, E, A> {
  return pipe(
    Ref.make<A>(seed),
    Effect.flatMap((ref) =>
      pipe(
        fx,
        runObserve((b) =>
          Effect.sync(() =>
            pipe(
              ref,
              Ref.update((a) => f(a, b)),
            ),
          ),
        ),
        Effect.flatMap(() => Ref.get(ref)),
      ),
    ),
    Effect.scoped,
  )
}

function runFilterReduce_<R, E, A, B>(
  fx: Fx<R, E, B>,
  seed: A,
  f: (a: A, b: B) => Option.Option<A>,
): Effect.Effect<R, E, A> {
  return pipe(
    Ref.make<A>(seed),
    Effect.flatMap((ref) =>
      pipe(
        fx,
        runObserve((b) =>
          Effect.sync(() =>
            pipe(
              ref,
              Ref.update((a) =>
                pipe(
                  f(a, b),
                  Option.getOrElse(() => a),
                ),
              ),
            ),
          ),
        ),
        Effect.flatMap(() => Ref.get(ref)),
      ),
    ),
    Effect.scoped,
  )
}
