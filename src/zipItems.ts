import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import { flow, pipe } from '@fp-ts/data/Function'
import { identity } from '@tsplus/stdlib/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { deferredCallback } from './_internal.js'

export function zipItems<A, B, C>(array: ReadonlyArray<A>, f: (a: A, b: B) => C) {
  return <R, E, E1>(fx: Fx<R, E, B, E1>): Fx<R, E, C, E1> =>
    Fx(<R2, E2, D>(sink: Sink<E, C, R2, E2, D>) =>
      deferredCallback<E1 | E2, D, R | R2, E1 | E2>((cb) => {
        let i = 0

        return fx.run(
          Sink(
            (b) => {
              const a = array[i++]
              const c = f(a, b)

              return pipe(
                sink.event(c),
                Effect.flatMap((x) =>
                  i === array.length
                    ? pipe(sink.end, Effect.flatMap(flow(Exit.succeed, cb)))
                    : Effect.succeed(x),
                ),
              )
            },
            sink.error,
            sink.end,
          ),
        )
      }),
    )
}

export function withItems<A>(array: ReadonlyArray<A>) {
  return <R, E, B, E1>(fx: Fx<R, E, B, E1>): Fx<R, E, A, E1> => pipe(fx, zipItems(array, identity))
}
