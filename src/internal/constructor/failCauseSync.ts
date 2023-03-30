import { methodWithTrace } from "@effect/data/Debug"
import type { LazyArg } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Fx<never, E, never> = methodWithTrace((trace) =>
  (cause) => fromEffect(Effect.failCauseSync(cause)).traced(trace)
)
