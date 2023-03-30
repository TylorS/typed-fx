import { dualWithTrace } from "@effect/data/Debug"
import type { Cause } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const logTraceCauseMessage: {
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
    <E>(message: string, cause: Cause.Cause<E>) => fromEffect(Effect.logTraceCauseMessage(message, cause)).traced(trace)
)
