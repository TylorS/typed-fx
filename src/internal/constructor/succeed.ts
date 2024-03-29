import { methodWithTrace } from "@effect/data/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const succeed: <A>(value: A) => Fx<never, never, A> = methodWithTrace((trace) =>
  (value) => fromEffect(Effect.succeed(value)).traced(trace)
)
