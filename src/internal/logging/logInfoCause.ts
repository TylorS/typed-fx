import { methodWithTrace } from "@effect/data/Debug"
import type { Cause } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const logInfoCause: <E>(cause: Cause.Cause<E>) => Fx<never, never, void> = methodWithTrace(
  (trace) => <E>(cause: Cause.Cause<E>) => fromEffect(Effect.logInfoCause(cause)).traced(trace)
)
