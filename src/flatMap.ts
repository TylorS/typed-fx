import { pipe } from "@effect/data/Function"
import { Fx, Sink } from "@typed/fx/Fx"
import { Cause, Effect, Fiber, Ref } from "./externals.js"

export function flatMap<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (a: A) => Fx<R2, E2, B>
): Fx<R | R2, E | E2, B> {
  return Fx((sink) =>
    Effect.scoped(Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Fiber.RuntimeFiber<never, void>>>([]))

      yield* $(fx.run(
        Sink(
          (a: A) =>
            Effect.gen(function*($) {
              const fiber = yield* $(
                Effect.forkScoped(
                  f(a).run(
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
            }),
          sink.error
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
