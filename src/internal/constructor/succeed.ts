import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const succeed: <A>(value: A) => Fx<never, never, A> = methodWithTrace((trace) =>
  (value) => fromEffect(Effect.succeed(value)).traced(trace)
)
