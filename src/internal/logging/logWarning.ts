import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const logWarning: (message: string) => Fx<never, never, void> = methodWithTrace(
  (trace) => (message: string) => fromEffect(Effect.logWarning(message)).traced(trace)
)
