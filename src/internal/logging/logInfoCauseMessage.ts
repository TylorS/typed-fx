import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Cause } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const logInfoCauseMessage: {
  <E>(
    message: string,
    cause: Cause.Cause<E>
  ): Fx<never, never, void>
  <E>(
    cause: Cause.Cause<E>
  ): (message: string) => Fx<never, never, void>
} = dualWithTrace(
  2,
  (trace) =>
    <E>(message: string, cause: Cause.Cause<E>) => fromEffect(Effect.logInfoCauseMessage(message, cause)).traced(trace)
)
