import type * as Option from "@effect/data/Option"
import { bodyWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const asyncOption: <R, E, A, R2>(
  register: (
    callback: (_: Effect.Effect<R, E, A>) => void
  ) => Option.Option<Effect.Effect<R, E, A>>,
  blockingOn?: FiberId.None | FiberId.Runtime | FiberId.Composite | undefined
) => Fx<R | R2, E, A> = bodyWithTrace((trace) =>
  <R, E, A, R2>(
    register: (
      callback: (_: Effect.Effect<R, E, A>) => void
    ) => Option.Option<Effect.Effect<R, E, A>>,
    blockingOn?: FiberId.None | FiberId.Runtime | FiberId.Composite | undefined
  ) => fromEffect(Effect.asyncOption<R | R2, E, A>(register, blockingOn)).traced(trace)
)
