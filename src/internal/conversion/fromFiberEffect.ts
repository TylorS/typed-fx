import { methodWithTrace } from "@effect/data/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fiber } from "@effect/io/Fiber"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const fromFiberEffect: <Services, Errors, Output>(
  fiber: Effect.Effect<Services, Errors, Fiber<Errors, Output>>
) => Fx<Services, Errors, Output> = methodWithTrace((trace) =>
  (fiber) => fromEffect(Effect.fromFiberEffect(fiber)).traced(trace)
)
