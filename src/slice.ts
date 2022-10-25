import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function slice(skip: number, take: number) {
  return <R, E, A>(push: Push<R, E, A>): Push<R, E, A> =>
    Push((emitter) =>
      pipe(
        Effect.suspendSucceed(() => {
          let toSkip = skip
          let toTake = take

          return push.run(
            Emitter(
              (a) => {
                if (toSkip > 0) {
                  --toSkip
                  return Effect.unit
                }

                return pipe(
                  emitter.event(a),
                  Effect.flatMap(() => (--toTake === 0 ? exitEarly : Effect.unit)),
                )
              },
              emitter.error,
              emitter.end,
            ),
          )
        }),
        onEarlyExitFailure(emitter.end),
      ),
    )
}

export function skip(n: number) {
  return slice(n, Infinity)
}

export function take(n: number) {
  return slice(0, n)
}
