import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'
import { runObserve } from './runObserve.js'

export function runReduce<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(push: Push<R, E, B>): Effect.Effect<R | Scope, E, A> => {
    return pipe(
      Ref.makeRef<A>(() => seed),
      Effect.flatMap((ref) =>
        pipe(
          push,
          runObserve((b) => Effect.sync(() => ref.update((a) => f(a, b)))),
          Effect.flatMap(() => ref.get),
        ),
      ),
    )
  }
}
