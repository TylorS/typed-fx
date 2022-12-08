import { Duration, Effect, Fiber, Ref, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function debounce(duration: Duration.Duration) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> => debounce_(fx, duration)
}

function debounce_<R, E, A>(fx: Fx<R, E, A>, duration: Duration.Duration): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      Ref.SynchronizedRef.make<Fiber.Fiber<never, unknown> | null>(null),
      Effect.flatMap((ref) =>
        withDynamicCountdownLatch(
          1,
          (latch) =>
            fx.run(
              Emitter(
                (a) =>
                  pipe(
                    ref,
                    Ref.SynchronizedRef.updateEffect((previous) =>
                      pipe(
                        previous ? Fiber.interrupt(previous) : latch.increment,
                        Effect.flatMap(() =>
                          pipe(
                            emitter.emit(a),
                            Effect.delay(duration),
                            Effect.interruptible,
                            Effect.tap(() => latch.decrement),
                            Effect.uninterruptible,
                            Effect.fork,
                          ),
                        ),
                      ),
                    ),
                  ),
                emitter.failCause,
                latch.decrement,
              ),
            ),
          emitter.end,
        ),
      ),
    ),
  )
}
