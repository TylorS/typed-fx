import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const promise: <A>(promise: () => Promise<A>) => Fx<never, never, A> = methodWithTrace(
  (trace) => (promise) => fromEffect(Effect.promise(promise)).traced(trace)
)
