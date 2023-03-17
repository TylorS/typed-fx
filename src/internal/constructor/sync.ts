import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const sync: <A>(
  f: () => A
) => Fx<never, never, A> = methodWithTrace((
  trace,
  restore
) => <A>(f: () => A) => fromEffect(Effect.sync(restore(f))).transform((e) => e.traced(trace)))
