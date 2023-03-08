import { flow } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import { isInterruptedOnly } from "@effect/io/Cause"
import { dualWithTrace } from "@effect/io/Debug"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"

export const observe: {
  <R, E, A, R2, E2>(
    fx: Fx<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, unknown>
  ): Effect.Effect<R | R2, E | E2, void>
  <A, R2, E2>(f: (a: A) => Effect.Effect<R2, E2, unknown>): <R, E>(
    fx: Fx<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, void>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2>(
      fx: Fx<R, E, A>,
      f: (a: A) => Effect.Effect<R2, E2, unknown>
    ): Effect.Effect<R | R2, E | E2, void> =>
      Effect.scoped(
        Effect.gen(function*($) {
          const deferred = yield* $(Deferred.make<E | E2, void>())
          const end = Deferred.succeed(deferred, undefined as void)
          const error = (cause: Cause<E | E2>) => isInterruptedOnly(cause) ? end : Deferred.failCause(deferred, cause)

          yield* $(
            Effect.forkScoped(fx.run(Sink(flow(f, Effect.catchAllCause(error)), error, () => end)))
          )

          return yield* $(Deferred.await(deferred))
        })
      ).traced(trace)
)
