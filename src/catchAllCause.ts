import { pipe } from "@effect/data/Function"
import { failCause } from "@typed/fx/failCause"
import { Fx, Sink } from "@typed/fx/Fx"
import { Cause, Effect, Either, Fiber, Ref } from "./externals.js"

export function catchAllCause<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Fx<R2, E2, B>
): Fx<R | R2, E2, A | B> {
  return Fx((sink) =>
    Effect.scoped(Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Fiber.RuntimeFiber<never, void>>>([]))

      yield* $(fx.run(
        Sink(
          sink.event,
          (cause: Cause.Cause<E>) =>
            Effect.gen(function*($) {
              const fiber = yield* $(
                Effect.forkScoped(
                  f(cause).run(
                    Sink(
                      sink.event,
                      (cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)
                    )
                  )
                )
              )

              // Add Fiber to fibers
              yield* $(Ref.update(ref, (fs) => [...fs, fiber]))

              // When the fiber ends, we need to remove it from the list of fibers
              yield* $(pipe(
                Fiber.join(fiber),
                Effect.flatMap(
                  () => Ref.update(ref, (fs) => fs.filter((f) => f !== fiber))
                ),
                // but don't allow this to be blocking
                Effect.forkScoped
              ))
            })
        )
      ))

      // Wait for the last fibers to finish
      const fibers = yield* $(Ref.get(ref))

      if (fibers.length > 0) {
        yield* $(Fiber.joinAll(fibers))
      }
    }))
  )
}

export function catchAll<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (e: E) => Fx<R2, E2, B>
) {
  return catchAllCause(fx, (cause) =>
    pipe(
      cause,
      Cause.failureOrCause,
      Either.match(
        f,
        failCause
      )
    ))
}
