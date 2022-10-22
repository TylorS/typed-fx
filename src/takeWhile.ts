import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@fp-ts/data/Predicate'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { deferredCallback } from './_internal.js'

export function takeWhile<A>(predicate: Predicate<A>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> =>
    Fx(<R2, E2, B>(sink: Sink<E, A, R2, E2, B>) =>
      deferredCallback<E1 | E2, B, R | R2, E1 | E2>((cb) => {
        return fx.run({
          ...sink,
          event: (a) => {
            if (predicate(a)) {
              return sink.event(a)
            }

            return pipe(
              sink.end,
              Effect.tap((b) => cb(Exit.succeed(b))),
            )
          },
        })
      }),
    )
}

export function takeUntil<A>(predicate: Predicate<A>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> => pipe(fx, takeWhile(not(predicate)))
}
