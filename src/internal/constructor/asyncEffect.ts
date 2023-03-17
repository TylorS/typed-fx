import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const asyncEffect: <R, E, A, R2, E2, B>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, B>
) => Fx<R | R2, E | E2, A> = methodWithTrace((trace) =>
  (register) => fromEffect(Effect.asyncEffect(register)).transform((e) => e.traced(trace))
)
