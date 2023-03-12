import type { LazyArg } from "@effect/data/Function"
import { bodyWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const failSync: <E>(error: LazyArg<E>) => Fx<never, E, never> = bodyWithTrace((trace) =>
  (error) => fromEffect(Effect.failSync(error)).traced(trace)
)
