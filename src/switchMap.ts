import { pipe } from "@effect/data/Function"
import { fromEffect } from "@typed/fx/fromEffect"
import { Fx, Sink } from "@typed/fx/Fx"
import { Cause, Effect, Fiber, RefS } from "./externals.js"

export function switchMap<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => Fx<R2, E2, B>
): Fx<R | R2, E | E2, B> {
  return Fx((sink) =>
    Effect.scoped(Effect.gen(function*($) {
      const ref = yield* $(RefS.make<Fiber.RuntimeFiber<never, void> | null>(null))
      const reset = RefS.set(ref, null)

      const switchEvent = (a: A) =>
        RefS.updateEffect(ref, (currentFiber) =>
          pipe(
            currentFiber ? Fiber.interruptFork(currentFiber) : Effect.unit(),
            Effect.flatMap(() =>
              pipe(
                f(a).run(Sink(
                  sink.event,
                  (cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)
                )),
                Effect.zipLeft(reset),
                Effect.forkScoped
              )
            )
          ))

      yield* $(fx.run(
        Sink(
          switchEvent,
          sink.error
        )
      ))

      // Wait for the last fiber to finish
      const fiber = yield* $(RefS.get(ref))

      if (fiber) {
        yield* $(Fiber.join(fiber))
      }
    }))
  )
}

export function switchMapEffect<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, B>
) {
  return switchMap(fx, (a) => fromEffect(f(a)))
}
