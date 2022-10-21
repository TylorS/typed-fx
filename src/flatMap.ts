import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { refCountDeferred } from './_internal.js'
import { MapStream } from './map.js'

export function flatMap<A, R2, E2, B, E3>(f: (a: A) => Stream<R2, E2, B, E3>) {
  return <R, E, E1>(self: Stream<R, E, A, E1>): Stream<R | R2, E | E2, B, E1 | E3> =>
    new FlatMapStream(self, f)
}

export class FlatMapStream<R, E, A, E1, R2, E2, B, E3>
  implements Stream<R2 | R, E | E2, B, E1 | E3>
{
  constructor(readonly self: Stream<R, E, A, E1>, readonly f: (a: A) => Stream<R2, E2, B, E3>) {}

  run<R3, E4, C>(sink: Sink<E | E2, B, R3, E4, C>): Effect.Effect<R2 | R | R3, E1 | E3 | E4, C> {
    const { self, f } = this

    return Effect.gen(function* ($) {
      const deferred = yield* $(refCountDeferred<E1 | E3 | E4, C>())

      return yield* $(
        self.run(
          Sink(
            (a) =>
              Effect.gen(function* ($) {
                yield* $(deferred.increment)

                yield* $(
                  Effect.fork(
                    f(a).run(
                      Sink(
                        sink.event,
                        flow(sink.error, deferred.error),
                        pipe(
                          deferred.decrement,
                          Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                        ),
                      ),
                    ),
                  ),
                )
              }),
            flow(sink.error, deferred.error, Effect.zipRight(deferred.await)),
            Effect.suspendSucceed(() =>
              pipe(
                deferred.end,
                Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                Effect.zipRight(deferred.await),
              ),
            ),
          ),
        ),
      )
    })
  }

  static make<R, E, A, E1, R2, E2, B, E3>(
    stream: Stream<R, E, A, E1>,
    f: (a: A) => Stream<R2, E2, B, E3>,
  ): Stream<R | R2, E | E2, B, E1 | E3> {
    if (stream instanceof MapStream) {
      return new FlatMapStream(stream.stream, flow(stream.f, f))
    }

    return new FlatMapStream(stream, f)
  }
}
