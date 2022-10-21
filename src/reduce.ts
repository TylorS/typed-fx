import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function reduce<B, A>(seed: B, f: (b: B, a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, B> =>
    pipe(
      makeRef<B>(() => seed),
      Effect.flatMap((ref) =>
        stream.run(Sink((a) => ref.update((b) => f(b, a)), Effect.failCause, ref.get)),
      ),
    )
}

export function collectAll<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, E | E1, readonly A[]> {
  return reduce<readonly A[], A>([], (b, a) => b.concat(a))(stream)
}
