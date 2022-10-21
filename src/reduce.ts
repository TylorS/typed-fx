import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { FilterMapStream, MapStream } from './map.js'

export function reduceFilterMap<R, E, A, E1, B>(seed: B, f: (b: B, a: A) => Maybe.Maybe<B>) {
  return (stream: Stream<R, E, A, E1>): Effect.Effect<R, E1 | E, B> => {
    return reduceFilterMap_(stream, seed, f)
  }
}

export function reduce<B, A>(seed: B, f: (b: B, a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, B> => {
    if (stream instanceof FilterMapStream) {
      return pipe(
        stream.stream,
        reduceFilterMap(seed, (b, a) =>
          pipe(
            a,
            stream.f,
            Maybe.map((a2) => f(b, a2)),
          ),
        ),
      )
    }

    if (stream instanceof MapStream) {
      return pipe(
        stream.stream,
        reduce(seed, (b, a) => f(b, stream.f(a))),
      )
    }

    return reduce_(stream, seed, f)
  }
}

export function collectAll<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, E | E1, readonly A[]> {
  return reduce_(stream, [] as readonly A[], (b, a) => b.concat(a))
}

function reduce_<R, E, A, E1, B>(stream: Stream<R, E, A, E1>, seed: B, f: (b: B, a: A) => B) {
  return pipe(
    makeRef<B>(() => seed),
    Effect.flatMap((ref) =>
      stream.run(Sink((a) => ref.update((b) => f(b, a)), Effect.failCause, ref.get)),
    ),
  )
}

function reduceFilterMap_<R, E, A, E1, B>(
  stream: Stream<R, E, A, E1>,
  seed: B,
  f: (b: B, a: A) => Maybe.Maybe<B>,
) {
  return pipe(
    makeRef<B>(() => seed),
    Effect.flatMap((ref) =>
      stream.run(
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
