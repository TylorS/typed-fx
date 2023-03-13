import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const die: (error: unknown) => Fx<never, never, never> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.die(error)).traced(trace)
)
