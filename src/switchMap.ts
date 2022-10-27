import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function switchMap<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, B>) =>
      pipe(
        Ref.makeSynchronized<Fiber.Fiber<never, unknown> | null>(() => null),
        Effect.flatMap((ref) =>
          withDynamicCountdownLatch(
            1,
            ({ increment, latch }) =>
              fx.run(
                Emitter(
                  (a) =>
                    ref.updateEffect((fiber) =>
                      pipe(
                        fiber ? Fiber.interrupt(fiber) : increment,
                        Effect.flatMap(() =>
                          Effect.forkScoped(
                            f(a).run(
                              Emitter(
                                emitter.emit,
                                (e) => pipe(ref.set(null), Effect.zipRight(emitter.failCause(e))),
                                pipe(ref.set(null), Effect.zipRight(latch.countDown)),
                              ),
                            ),
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
