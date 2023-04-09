import { pipe } from "@effect/data/Function"
import { failCause } from "@typed/fx/failCause"
import { fromEffect } from "@typed/fx/fromEffect"
import { Fx, Sink } from "@typed/fx/Fx"
import { Cause, Effect, Either, Fiber, RefS } from "./externals.js"

export function switchMatchCause<R, E, A, R2, E2, B, R3, E3, C>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Fx<R2, E2, B>,
  g: (a: A) => Fx<R3, E3, C>
): Fx<R | R2 | R3, E2 | E3, B | C> {
  return Fx((sink) =>
    Effect.scoped(Effect.gen(function*($) {
      const ref = yield* $(RefS.make<Fiber.RuntimeFiber<never, void> | null>(null))
      const reset = RefS.set(ref, null)

      const switchWith = (f: () => Fx<R2 | R3, E2 | E3, B | C>) =>
        RefS.updateEffect(ref, (currentFiber) =>
          pipe(
            currentFiber ? Fiber.interruptFork(currentFiber) : Effect.unit(),
            Effect.flatMap(() =>
              pipe(
                f().run(Sink(
                  sink.event,
                  (cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)
                )),
                Effect.zipLeft(reset),
                Effect.catchAllCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)),
                Effect.forkScoped
              )
            )
          ))

      yield* $(fx.run(
        Sink(
          (a) => switchWith(() => g(a)),
          (cause) => switchWith(() => f(cause))
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

export function switchMatch<R, E, A, R2, E2, B, R3, E3, C>(
  fx: Fx<R, E, A>,
  f: (error: E) => Fx<R2, E2, B>,
  g: (a: A) => Fx<R3, E3, C>
): Fx<R | R2 | R3, E2 | E3, B | C> {
  return switchMatchCause(
    fx,
    (cause) =>
      pipe(
        cause,
        Cause.failureOrCause,
        Either.match(
          f,
          failCause
        )
      ),
    g
  )
}

export function switchMatchCauseEffect<R, E, A, R2, E2, B, R3, E3, C>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, B>,
  g: (a: A) => Effect.Effect<R3, E3, C>
): Fx<R | R2 | R3, E2 | E3, B | C> {
  return switchMatchCause(fx, (a) => fromEffect(f(a)), (b) => fromEffect(g(b)))
}

export function switchMatchEffect<R, E, A, R2, E2, B, R3, E3, C>(
  fx: Fx<R, E, A>,
  f: (error: E) => Effect.Effect<R2, E2, B>,
  g: (a: A) => Effect.Effect<R3, E3, C>
): Fx<R | R2 | R3, E2 | E3, B | C> {
  return switchMatch(fx, (a) => fromEffect(f(a)), (b) => fromEffect(g(b)))
}