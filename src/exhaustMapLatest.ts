import { Effect, Fiber, Ref, Scope, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function exhaustMapLatest<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, B>) =>
      pipe(
        Ref.SynchronizedRef.make<Fiber.Fiber<never, unknown> | null>(null),
        Effect.zip(Ref.make<Fx<R2, E2, B> | null>(null)),
        Effect.flatMap(([fiberRef, nextFxRef]) => {
          return withDynamicCountdownLatch(
            1,
            (latch) => {
              const runNextFx: Effect.Effect<R3 | R2 | Scope.Scope, never, void> = pipe(
                nextFxRef,
                Ref.getAndSet<Fx<R2, E2, B> | null>(null),
                Effect.flatMap((fx) =>
                  fx
                    ? pipe(
                        fiberRef,
                        Ref.SynchronizedRef.updateEffect<
                          Fiber.Fiber<never, unknown> | null,
                          R2 | Scope.Scope | R3,
                          never
                        >(() => runFx(fx)),
                      )
                    : latch.decrement,
                ),
              )

              const runFx = (fx: Fx<R2, E2, B>) =>
                Effect.forkScoped(
                  fx.run(
                    Emitter(
                      emitter.emit,
                      (e) =>
                        pipe(
                          fiberRef,
                          Ref.SynchronizedRef.set<Fiber.Fiber<never, unknown> | null>(null),
                          Effect.zipRight(emitter.failCause(e)),
                        ),
                      pipe(
                        fiberRef,
                        Ref.SynchronizedRef.set<Fiber.Fiber<never, unknown> | null>(null),
                        Effect.zipRight(runNextFx),
                      ),
                    ),
                  ),
                )

              return fx.run(
                Emitter(
                  (a) =>
                    pipe(
                      fiberRef,
                      Ref.SynchronizedRef.updateEffect<
                        Fiber.Fiber<never, unknown> | null,
                        R2 | Scope.Scope | R3,
                        never
                      >((fiber) =>
                        fiber
                          ? pipe(nextFxRef, Ref.set<Fx<R2, E2, B> | null>(f(a)), Effect.as(fiber))
                          : pipe(
                              latch.increment,
                              Effect.flatMap(() => runFx(f(a))),
                            ),
                      ),
                    ),
                  emitter.failCause,
                  latch.decrement,
                ),
              )
            },
            emitter.end,
          )
        }),
      ),
    )
}
