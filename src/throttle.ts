import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function throttle(duration: Duration.Duration) {
  return <R, E, A>(push: Push<R, E, A>): Push<R, E, A> => throttle_(push, duration)
}

function throttle_<R, E, A>(push: Push<R, E, A>, duration: Duration.Duration): Push<R, E, A> {
  return Push((emitter) =>
    pipe(
      Ref.makeSynchronized<Fiber.Fiber<never, unknown> | null>(() => null),
      Effect.flatMap((ref) =>
        withDynamicCountdownLatch(
          1,
          ({ increment, latch }) =>
            push.run(
              Emitter(
                (a) =>
                  ref.updateEffect((previous) =>
                    previous
                      ? Effect.succeed(previous)
                      : pipe(
                          increment,
                          Effect.flatMap(() =>
                            pipe(
                              emitter.emit(a),
                              Effect.delay(duration),
                              Effect.interruptible,
                              Effect.tap(() =>
                                pipe(ref.set(null), Effect.zipRight(latch.countDown)),
                              ),
                              Effect.uninterruptible,
                              Effect.fork,
                            ),
                          ),
                        ),
                  ),
                emitter.failCause,
                latch.countDown,
              ),
            ),
          emitter.end,
        ),
      ),
    ),
  )
}
