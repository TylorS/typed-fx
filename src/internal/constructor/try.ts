import { methodWithTrace } from "@effect/data/Debug"
import type { LazyArg } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

const try_: <A>(
  f: LazyArg<A>
) => Fx<never, unknown, A> = methodWithTrace((trace) => <A>(f: LazyArg<A>) => fromEffect(Effect.try(f)).traced(trace))

export { try_ as try }
