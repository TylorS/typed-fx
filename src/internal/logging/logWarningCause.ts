import { methodWithTrace } from "@effect/io/Debug"
import type { Cause } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const logWarningCause: <E>(cause: Cause.Cause<E>) => Fx<never, never, void> = methodWithTrace(
  (trace) => <E>(cause: Cause.Cause<E>) => fromEffect(Effect.logWarningCause(cause)).traced(trace)
)
