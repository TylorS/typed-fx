import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'

import { Push } from './Push.js'
import { runObserve } from './runObserve.js'

export function runCollect<R, E, A>(push: Push<R, E, A>): Effect.Effect<R, E, Chunk.Chunk<A>> {
  return pipe(
    Effect.sync<A[]>(() => []),
    Effect.flatMap((values) =>
      pipe(
        push,
        runObserve((a) => Effect.sync(() => values.push(a))),
        Effect.map(() => Chunk.from(values)),
      ),
    ),
  )
}