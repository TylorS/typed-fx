import { Effect, Fiber, Ref, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function exhaustMap<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, B>) =>
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
                      Ref.SynchronizedRef.updateEffect((fiber) =>
                        fiber
                          ? Effect.succeed(fiber)
                          : pipe(
                              latch.increment,
                              Effect.flatMap(() =>
                                Effect.forkScoped(
                                  f(a).run(
                                    Emitter(
                                      emitter.emit,
                                      (e) =>
                                        pipe(
                                          ref,
                                          Ref.SynchronizedRef.set<Fiber.Fiber<
                                            never,
                                            unknown
                                          > | null>(null),
                                          Effect.zipRight(emitter.failCause(e)),
                                        ),
                                      pipe(
                                        ref,
                                        Ref.set<Fiber.Fiber<never, unknown> | null>(null),
                                        Effect.zipRight(latch.decrement),
                                      ),
                                    ),
                                  ),
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
