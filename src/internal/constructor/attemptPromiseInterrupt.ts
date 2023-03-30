import { methodWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const attemptPromiseInterrupt: <A>(
  f: (signal: AbortSignal) => Promise<A>
) => Fx<never, unknown, A> = methodWithTrace((
  trace,
  restore
) =>
  <A>(f: (signal: AbortSignal) => Promise<A>) => fromEffect(Effect.attemptPromiseInterrupt(restore(f))).traced(trace)
)
