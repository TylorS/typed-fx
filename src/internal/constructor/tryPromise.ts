import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const tryPromise: <A>(
  f: () => Promise<A>
) => Fx<never, unknown, A> = bodyWithTrace((
  trace,
  restore
) => <A>(f: () => Promise<A>) => fromEffect(Effect.tryPromise(restore(f))).traced(trace))
