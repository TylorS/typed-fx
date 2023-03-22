import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const attemptCatchPromiseInterrupt: <A, E>(
  f: (signal: AbortSignal) => Promise<A>,
  onFail: (error: unknown) => E
) => Fx<never, E, A> = methodWithTrace((
  trace,
  restore
) =>
  <A, E>(f: (signal: AbortSignal) => Promise<A>, onFail: (error: unknown) => E) =>
    fromEffect(Effect.attemptCatchPromiseInterrupt(restore(f), restore(onFail))).traced(trace)
)
