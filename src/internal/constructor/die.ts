import { methodWithTrace } from "@effect/data/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const die: (error: unknown) => Fx<never, never, never> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.die(error)).traced(trace)
)
