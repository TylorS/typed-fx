import { Effect, pipe } from 'effect'

import { Fx } from './Fx.js'
import { onEarlyExitFailure } from './_internal.js'
import { runObserve } from './runObserve.js'

export function runCollect<R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, ReadonlyArray<A>> {
  return pipe(
    Effect.sync<A[]>(() => []),
    Effect.flatMap((values) =>
      pipe(
        fx,
        runObserve((a) => Effect.sync(() => values.push(a))),
        onEarlyExitFailure(Effect.unit()),
        Effect.map(() => values),
      ),
    ),
    Effect.scoped,
  )
}
