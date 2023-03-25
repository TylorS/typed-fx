import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const promise: <A>(promise: () => Promise<A>) => Fx<never, never, A> = methodWithTrace(
  (trace) => (promise) => fromEffect(Effect.promise(promise)).traced(trace)
)
