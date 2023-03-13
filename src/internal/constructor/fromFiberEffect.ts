import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fiber } from "@effect/io/Fiber"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromFiberEffect: <Services, Errors, Output>(
  fiber: Effect.Effect<Services, Errors, Fiber<Errors, Output>>
) => Fx<Services, Errors, Output> = methodWithTrace((trace) =>
  (fiber) => fromEffect(Effect.fromFiberEffect(fiber)).traced(trace)
)
