import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Push } from './Push.js'
import { runObserve } from './runObserve.js'

export function runReduce<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(push: Push<R, E, B>): Effect.Effect<R, E, A> => {
    return runReduce_(push, seed, f)
  }
}

export function runFilterReduce<A, B>(seed: A, f: (a: A, b: B) => Maybe.Maybe<A>) {
  return <R, E>(push: Push<R, E, B>): Effect.Effect<R, E, A> => {
    return runFilterReduce_(push, seed, f)
  }
}

function runReduce_<R, E, A, B>(
  push: Push<R, E, B>,
  seed: A,
  f: (a: A, b: B) => A,
): Effect.Effect<R, E, A> {
  return pipe(
    Ref.makeRef<A>(() => seed),
    Effect.flatMap((ref) =>
      pipe(
        push,
        runObserve((b) => Effect.sync(() => ref.update((a) => f(a, b)))),
        Effect.flatMap(() => ref.get),
      ),
    ),
    Effect.scoped,
  )
}

function runFilterReduce_<R, E, A, B>(
  push: Push<R, E, B>,
  seed: A,
  f: (a: A, b: B) => Maybe.Maybe<A>,
): Effect.Effect<R, E, A> {
  return pipe(
    Ref.makeRef<A>(() => seed),
    Effect.flatMap((ref) =>
      pipe(
        push,
        runObserve((b) =>
          Effect.sync(() =>
            ref.update((a) =>
              pipe(
                f(a, b),
                Maybe.getOrElse(() => a),
              ),
            ),
          ),
        ),
        Effect.flatMap(() => ref.get),
      ),
    ),
    Effect.scoped,
  )
}
