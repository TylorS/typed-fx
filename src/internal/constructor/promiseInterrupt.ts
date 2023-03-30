import { methodWithTrace } from "@effect/data/Debug"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const promiseInterrupt: <A>(promise: (signal: AbortSignal) => Promise<A>) => Fx<never, unknown, A> =
  methodWithTrace((trace) => (promise) => fromEffect(Effect.promiseInterrupt(promise)).traced(trace))
