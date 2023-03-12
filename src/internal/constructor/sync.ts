import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const sync: <A>(
  f: () => A
) => Fx<never, never, A> = bodyWithTrace((
  trace,
  restore
) => <A>(f: () => A) => fromEffect(Effect.sync(restore(f))).traced(trace))
