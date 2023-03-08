import { flow } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fiber } from "@effect/io/Fiber"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const fromFiber: <Errors, Output>(fiber: Fiber<Errors, Output>) => Fx<never, Errors, Output> = flow(
  Effect.fromFiber,
  fromEffect
)
