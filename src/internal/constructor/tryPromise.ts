import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const tryPromise: <A>(
  f: () => Promise<A>
) => Fx<never, unknown, A> = methodWithTrace((
  trace,
  restore
) => <A>(f: () => Promise<A>) => fromEffect(Effect.tryPromise(restore(f))).transform((e) => e.traced(trace)))
