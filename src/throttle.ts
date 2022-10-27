import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function throttle(duration: Duration.Duration) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> => throttle_(fx, duration)
}

function throttle_<R, E, A>(fx: Fx<R, E, A>, duration: Duration.Duration): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      Ref.makeSynchronized<Fiber.Fiber<never, unknown> | null>(() => null),
      Effect.flatMap((ref) =>
        withDynamicCountdownLatch(
          1,
          ({ increment, latch }) =>
            fx.run(
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
