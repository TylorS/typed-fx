import { methodWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const tryPromise: <A>(
  f: () => Promise<A>
) => Fx<never, unknown, A> = methodWithTrace((
  trace,
  restore
) => <A>(f: () => Promise<A>) => fromEffect(Effect.tryPromise(restore(f))).traced(trace))
