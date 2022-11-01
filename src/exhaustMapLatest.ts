import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function exhaustMapLatest<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx(<R3>(emitter: Emitter<R3, E | E2, B>) =>
      pipe(
        Ref.makeSynchronized<Fiber.Fiber<never, unknown> | null>(() => null),
        Effect.zip(Ref.makeRef<Fx<R2, E2, B> | null>(() => null)),
        Effect.flatMap(([fiberRef, nextFxRef]) => {
          return withDynamicCountdownLatch(
            1,
            ({ increment, latch }) => {
              const runNextFx: Effect.Effect<R3 | R2 | Scope, never, void> = pipe(
                nextFxRef.getAndSet(null),
                Effect.flatMap((fx) =>
                  fx ? fiberRef.updateEffect(() => runFx(fx)) : latch.countDown,
                ),
              )

              const runFx = (fx: Fx<R2, E2, B>) =>
                Effect.forkScoped(
                  fx.run(
                    Emitter(
                      emitter.emit,
                      (e) => pipe(fiberRef.set(null), Effect.zipRight(emitter.failCause(e))),
                      pipe(fiberRef.set(null), Effect.zipRight(runNextFx)),
                    ),
                  ),
                )

              return fx.run(
                Emitter(
                  (a) =>
                    fiberRef.updateEffect((fiber) =>
                      fiber
                        ? pipe(nextFxRef.set(f(a)), Effect.as(fiber))
                        : pipe(
                            increment,
                            Effect.flatMap(() => runFx(f(a))),
                          ),
                    ),
                  emitter.failCause,
                  latch.countDown,
                ),
              )
            },
            emitter.end,
          )
        }),
      ),
    )
}
