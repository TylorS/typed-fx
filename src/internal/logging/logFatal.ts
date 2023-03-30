import { methodWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const logFatal: (message: string) => Fx<never, never, void> = methodWithTrace(
  (trace) => (message: string) => fromEffect(Effect.logFatal(message)).traced(trace)
)
