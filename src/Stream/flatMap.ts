import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'

import { Stream } from './Stream.js'

import * as Sink from '@/Sink/Sink.js'

export function flatMap<A, R2, E2, B, E3 = never>(f: (a: A) => Stream<R2, E2, B, E3>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R | R2, E | E2, B, E1 | E3> =>
    new FlatMapStream(stream, f)
}

export class FlatMapStream<R, E, A, E1, R2, E2, B, E3>
  implements Stream<R | R2, E | E2, B, E1 | E3>
{
  constructor(readonly stream: Stream<R, E, A, E1>, readonly f: (a: A) => Stream<R2, E2, B, E3>) {}

  fork<R4, E4, B4>(
    sink: Sink.Sink<E | E2, B, R4, E4, B4>,
  ): Effect.Effect<R | R2 | R4, never, Fiber<E1 | E3 | E4, B4>> {
    return Effect.suspendSucceed(() => {
      let ended = false
      let running = 0

      return pipe(
        Deferred.make<E1 | E3 | E4, B4>(),
        Effect.flatMap((deferred) => {
          const endIfComplete = () =>
            ended && running === 0
              ? pipe(sink.end, Effect.intoDeferred(deferred), Effect.asUnit)
              : Effect.unit

          const s: Sink.Sink<E, A, R | R2 | R4, E1 | E3 | E4, B4> = Sink.Sink(
            (a) =>
              Effect.suspendSucceed(() => {
                running++

                return this.f(a).fork(
                  Sink.Sink(
                    sink.event,
                    (e) => pipe(e, sink.error, Effect.intoDeferred(deferred), Effect.asUnit),
                    Effect.suspendSucceed(() => {
                      running--
                      return endIfComplete()
                    }),
                  ),
                )
              }),
            (e) =>
              pipe(e, sink.error, Effect.intoDeferred(deferred), Effect.zipRight(deferred.await)),
            Effect.suspendSucceed(() => {
              ended = true

              return pipe(endIfComplete(), Effect.zipRight(deferred.await))
            }),
          )

          return this.stream.fork(s)
        }),
      )
    })
  }
}
