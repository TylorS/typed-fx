import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const fail: <E>(error: E) => Fx<never, E, never> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.fail(error)).transform((e) => e.traced(trace))
)
