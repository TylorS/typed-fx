import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Stream } from './Stream.js'

export function slice(skip: number, take: number) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    Stream<R, E, A>((sink) => {
      let toSkip = skip
      let toTake = take

      return stream.fork({
        event: (a) =>
          Effect.suspendSucceed(() => {
            if (toSkip > 0) {
              toSkip--
              return Effect.unit
            }

            if (take === 0) {
              return Effect.unit
            }

            toTake--

            return pipe(
              sink.event(a),
              Effect.flatMap(() => (toTake === 0 ? sink.end : Effect.unit)),
            )
          }),
        error: sink.error,
        end: sink.end,
      })
    })
}

export const take = (n: number) => slice(0, n)

export const skip = (n: number) => slice(n, Infinity)
