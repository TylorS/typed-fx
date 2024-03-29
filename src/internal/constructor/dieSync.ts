import { methodWithTrace } from "@effect/data/Debug"
import type { LazyArg } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const dieSync: (error: LazyArg<unknown>) => Fx<never, never, never> = methodWithTrace((trace) =>
  (error) => fromEffect(Effect.dieSync(error)).traced(trace)
)
