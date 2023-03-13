import type { LazyArg } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Fx<never, E, never> = methodWithTrace((trace) =>
  (cause) => fromEffect(Effect.failCauseSync(cause)).traced(trace)
)
