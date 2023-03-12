import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const tryPromiseInterrupt: <A>(
  f: (signal: AbortSignal) => Promise<A>
) => Fx<never, unknown, A> = bodyWithTrace((
  trace,
  restore
) => <A>(f: (signal: AbortSignal) => Promise<A>) => fromEffect(Effect.tryPromiseInterrupt(restore(f))).traced(trace))
