import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const tryCatchPromiseInterrupt: <A, E>(
  f: (signal: AbortSignal) => Promise<A>,
  onFail: (error: unknown) => E
) => Fx<never, E, A> = bodyWithTrace((
  trace,
  restore
) =>
  <A, E>(f: (signal: AbortSignal) => Promise<A>, onFail: (error: unknown) => E) =>
    fromEffect(Effect.tryCatchPromiseInterrupt(restore(f), restore(onFail))).traced(trace)
)
