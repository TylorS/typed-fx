import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import * as Queue from '@effect/core/io/Queue'
import * as Channel from '@effect/core/stream/Channel'
import * as Stream from '@effect/core/stream/Stream'
import { pipe } from '@fp-ts/data/Function'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'

/**
 * Converts an Fx into a Stream that utilizes a bufferSize for the underlying
 * Queue that the Stream utilizes to pull from.
 */
export const toStream =
  (bufferSize = 1024) =>
  <R, E, A>(fx: Fx<R, E, A>): Stream.Stream<R, E, A> => {
    return Stream.unwrapScoped(
      Effect.gen(function* ($) {
        const queue = yield* $(
          Effect.acquireRelease(
            Queue.bounded<Maybe.Maybe<Exit.Exit<E, A>>>(bufferSize),
            (q) => q.shutdown,
          ),
        )

        yield* $(
          Effect.forkScoped(
            fx.run(
              Emitter(
                (a) => queue.offer(Maybe.some(Exit.succeed(a))),
                (c) => queue.offer(Maybe.some(Exit.failCause(c))),
                queue.offer(Maybe.none),
              ),
            ),
          ),
        )

        return Stream.fromChannel(loop(queue, bufferSize))
      }),
    )
  }

function loop<E, A>(
  queue: Queue.Queue<Maybe.Maybe<Exit.Exit<E, A>>>,
  bufferSize: number,
): Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.unwrap(
    pipe(
      queue.takeBetween(1, bufferSize),
      Effect.map((chunk) => {
        const elements: Array<A> = []

        for (const element of chunk) {
          if (Maybe.isNone(element)) {
            return pipe(
              Channel.write(Chunk.from(elements)),
              Channel.flatMap(() => Channel.succeed(void 0)),
            )
          }

          if (Exit.isFailure(element.value)) {
            const cause = element.value.cause
            return pipe(
              Channel.write(Chunk.from(elements)),
              Channel.flatMap(() => Channel.failCause(cause)),
            )
          }

          elements.push(element.value.value)
        }

        return pipe(
          Channel.write(Chunk.from(elements)),
          Channel.flatMap(() => loop(queue, bufferSize)),
        )
      }),
    ),
  )
}
