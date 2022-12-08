import { Effect, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

// TODO: Commutation with map
// TODO: Fusion with other slices

export function slice(skip: number, take: number) {
  return <R, E, A>(push: Fx<R, E, A>): Fx<R, E, A> =>
    Fx((emitter) =>
      pipe(
        Effect.suspendSucceed(() => {
          let toSkip = skip
          let toTake = take

          return push.run(
            Emitter(
              (a) => {
                if (toSkip > 0) {
                  --toSkip
                  return Effect.unit()
                }

                return pipe(
                  emitter.emit(a),
                  Effect.flatMap(() => (--toTake === 0 ? exitEarly : Effect.unit())),
                )
              },
              emitter.failCause,
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
