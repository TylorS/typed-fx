import * as Effect from '@effect/core/io/Effect'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'

import { Push } from './Push.js'
import { runObserve } from './runObserve.js'

export function runCollect<R, E, A>(
  push: Push<R, E, A>,
): Effect.Effect<R | Scope, E, ReadonlyArray<A>> {
  return pipe(
    Effect.sync<A[]>(() => []),
    Effect.flatMap((values) =>
      pipe(
        push,
        runObserve((a) => Effect.sync(() => values.push(a))),
        Effect.map(() => values),
      ),
    ),
  )
}
