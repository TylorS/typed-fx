import type * as Either from "@effect/data/Either"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const asyncInterruptEither: <R, E, A, R2>(
  register: (
    callback: (_: Effect.Effect<R, E, A>) => void
  ) => Either.Either<Effect.Effect<R2, never, void>, Effect.Effect<R, E, A>>,
  blockingOn?: FiberId.None | FiberId.Runtime | FiberId.Composite | undefined
) => Fx<R | R2, E, A> = methodWithTrace((trace) =>
  <R, E, A, R2>(
    register: (
      callback: (_: Effect.Effect<R, E, A>) => void
    ) => Either.Either<Effect.Effect<R2, never, void>, Effect.Effect<R, E, A>>,
    blockingOn?: FiberId.None | FiberId.Runtime | FiberId.Composite | undefined
  ) => fromEffect(Effect.asyncInterruptEither<R | R2, E, A>(register, blockingOn)).transform((e) => e.traced(trace))
)
