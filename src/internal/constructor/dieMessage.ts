import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const dieMessage: (message: string) => Fx<never, never, never> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.dieMessage(error)).traced(trace)
)
