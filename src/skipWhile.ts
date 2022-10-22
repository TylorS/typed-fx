import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@fp-ts/data/Predicate'

import { Fx } from './Fx.js'

export function skipWhile<A>(predicate: Predicate<A>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> =>
    Fx((sink) =>
      Effect.suspendSucceed(() => {
        let started = false

        return fx.run({
          ...sink,
          event: (a) => {
            if (!started && predicate(a)) {
              return Effect.unit
            }

            started = true

            return sink.event(a)
          },
        })
      }),
    )
}

export function skipUntil<A>(predicate: Predicate<A>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> => pipe(fx, skipWhile(not(predicate)))
}
