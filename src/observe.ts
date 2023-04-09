import type { Scope } from "@effect/io/Scope"
import type { Cause } from "@typed/fx/externals"
import { Deferred, Effect, Fiber } from "@typed/fx/externals"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"

export function observe<R, E, A, R2, E2>(
  fx: Fx<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, void>
): Effect.Effect<R | R2 | Scope, E | E2, void> {
  return Effect.gen(function*($) {
    const deferred = yield* $(Deferred.make<E | E2, void>())
    const error = (cause: Cause.Cause<E | E2>) => Deferred.failCause(deferred, cause)
    const end = () => Deferred.succeed(deferred, undefined)

    const fiber = yield* $(
      Effect.forkScoped(Effect.flatMap(
        fx.run(
          Sink(
            (a: A) => Effect.catchAllCause(f(a), error),
            error
          )
        ),
        end
      ))
    )

    const a = yield* $(Deferred.await(deferred))

    yield* $(Fiber.interruptFork(fiber))

    return a
  })
}