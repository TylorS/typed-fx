import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'
import { runObserve } from './runObserve.js'

export function runCollect<R, E, A>(push: Push<R, E, A>): Effect.Effect<R, E, readonly A[]> {
  return pipe(
    Ref.makeRef<A[]>(() => []),
    Effect.flatMap((ref) =>
      pipe(
        push,
        runObserve((a) => ref.update((as) => (as.push(a), as))),
        Effect.zipRight(ref.get),
      ),
    ),
  )
}
