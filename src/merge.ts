import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'
import { refCountDeferred } from './_internal.js'

export function merge<R2, E2, B, E3>(other: Stream<R2, E2, B, E3>) {
  return <R, E, A, E1>(self: Stream<R, E, A, E1>): Stream<R | R2, E | E2, A | B, E1 | E3> =>
    mergeAll([self, other])
}

export function mergeAll<Streams extends ReadonlyArray<Stream<any, any, any, any>>>(
  streams: readonly [...Streams],
): Stream<
  Stream.ResourcesOf<Streams[number]>,
  Stream.ErrorsOf<Streams[number]>,
  Stream.OutputOf<Streams[number]>,
  Stream.ReturnErrorsOf<Streams[number]>
>

export function mergeAll<R2, E2, B, E3>(
  streams: Iterable<Stream<R2, E2, B, E3>>,
): Stream<R2, E2, B, E3>

export function mergeAll<R2, E2, B, E3>(
  streams: Iterable<Stream<R2, E2, B, E3>>,
): Stream<R2, E2, B, E3> {
  return Stream(<R4, E4, C>(sink: Sink<E2, B, R4, E4, C>) =>
    Effect.gen(function* ($) {
      const deferred = yield* $(refCountDeferred<E3 | E4, C>(true))

      const run = (stream: Stream<R2 | R4, E2, B, E3 | E4>) =>
        pipe(
          deferred.increment,
          Effect.zipRight(
            Effect.fork(
              stream.run(
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
          ),
        )

      for (const stream of streams) {
        yield* $(run(stream))
      }

      return yield* $(deferred.await)
    }),
  )
}
