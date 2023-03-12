import type { LazyArg } from "@effect/data/Function"
import { bodyWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const attempt: <A>(
  f: LazyArg<A>
) => Fx<never, unknown, A> = bodyWithTrace((trace) => <A>(f: LazyArg<A>) => fromEffect(Effect.attempt(f)).traced(trace))
