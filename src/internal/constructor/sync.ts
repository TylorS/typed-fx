import { methodWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const sync: <A>(
  f: () => A
) => Fx<never, never, A> = methodWithTrace((
  trace,
  restore
) => <A>(f: () => A) => fromEffect(Effect.sync(restore(f))).traced(trace))
