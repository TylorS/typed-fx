import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { FilterMapFx, MapFx } from './map.js'

export function reduceFilterMap<R, E, A, E1, B>(seed: B, f: (b: B, a: A) => Maybe.Maybe<B>) {
  return (fx: Fx<R, E, A, E1>): Effect.Effect<R, E1 | E, B> => {
    return reduceFilterMap_(fx, seed, f)
  }
}

export function reduce<B, A>(seed: B, f: (b: B, a: A) => B) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Effect.Effect<R, E | E1, B> => {
    if (fx instanceof FilterMapFx) {
      return pipe(
        fx.fx,
        reduceFilterMap(seed, (b, a) =>
          pipe(
            a,
            fx.f,
            Maybe.map((a2) => f(b, a2)),
          ),
        ),
      )
    }

    if (fx instanceof MapFx) {
      return pipe(
        fx.fx,
        reduce(seed, (b, a) => f(b, fx.f(a))),
      )
    }

    return reduce_(fx, seed, f)
  }
}

export function collectAll<R, E, A, E1>(
  fx: Fx<R, E, A, E1>,
): Effect.Effect<R, E | E1, readonly A[]> {
  return reduce_(fx, [] as readonly A[], (b, a) => b.concat(a))
}

function reduce_<R, E, A, E1, B>(fx: Fx<R, E, A, E1>, seed: B, f: (b: B, a: A) => B) {
  return pipe(
    makeRef<B>(() => seed),
    Effect.flatMap((ref) =>
      fx.run(Sink((a) => ref.update((b) => f(b, a)), Effect.failCause, ref.get)),
    ),
  )
}

function reduceFilterMap_<R, E, A, E1, B>(
  fx: Fx<R, E, A, E1>,
  seed: B,
  f: (b: B, a: A) => Maybe.Maybe<B>,
) {
  return pipe(
    makeRef<B>(() => seed),
    Effect.flatMap((ref) =>
      fx.run(
        Sink(
          (a) =>
            ref.modify((b) => [
              null,
              pipe(
                f(b, a),
                Maybe.getOrElse(() => b),
              ),
            ]),
          Effect.failCause,
          ref.get,
        ),
      ),
    ),
  )
}
