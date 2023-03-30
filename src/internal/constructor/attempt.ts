import { methodWithTrace } from "@effect/data/Debug"
import type { LazyArg } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const attempt: <A>(
  f: LazyArg<A>
) => Fx<never, unknown, A> = methodWithTrace((trace) =>
  <A>(f: LazyArg<A>) => fromEffect(Effect.attempt(f)).traced(trace)
)
