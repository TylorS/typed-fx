import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { deferredCallback } from './_internal.js'

export function slice(skip: number, take: number) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> =>
    Fx(<R2, E2, B>(sink: Sink<E, A, R2, E2, B>) =>
      deferredCallback<E1 | E2, B, R | R2, E1 | E2>((cb) => {
        let toSkip = skip
        let toTake = take

        return fx.run({
          ...sink,
          event: (a) => {
            if (toSkip > 0) {
              toSkip -= 1
              return Effect.unit
            }

            if (toTake === 0) {
              return Effect.unit
            }

            toTake -= 1

            return pipe(
              sink.event(a),
              Effect.flatMap(() =>
                toTake === 0
                  ? pipe(
                      sink.end,
                      Effect.tap((b) => cb(Exit.succeed(b))),
                    )
                  : Effect.unit,
              ),
            )
          },
        })
      }),
    )
}

export function skip(skip: number) {
  return slice(skip, Infinity)
}

export function take(take: number) {
  return slice(0, take)
}
