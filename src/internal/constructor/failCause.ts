import type { Cause } from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const failCause: <E>(cause: Cause<E>) => Fx<never, E, never> = methodWithTrace((trace) =>
  (cause) => fromEffect(Effect.failCause(cause)).transform((e) => e.traced(trace))
)
