import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function switchMap<A, R2, E2, B>(f: (a: A) => Push<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    Push(<R3, E3>(emitter: Emitter<E | E2, B, R3, E3>) =>
      pipe(
        Ref.makeSynchronized<Fiber.Fiber<E3, unknown> | null>(() => null),
        Effect.flatMap((ref) =>
          withDynamicCountdownLatch(
            1,
            ({ increment, latch }) =>
              push.run(
                Emitter(
                  (a) =>
                    ref.updateEffect((fiber) =>
                      pipe(
                        fiber ? Fiber.interrupt(fiber) : increment,
                        Effect.flatMap(() =>
                          Effect.forkScoped(
                            f(a).run(Emitter(emitter.emit, emitter.failCause, latch.countDown)),
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
