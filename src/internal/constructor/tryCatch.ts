import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const tryCatch: <A, E>(
  f: () => A,
  onFail: (error: unknown) => E
) => Fx<never, E, A> = bodyWithTrace((
  trace,
  restore
) =>
  <A, E>(f: () => A, onFail: (error: unknown) => E) =>
    fromEffect(Effect.tryCatch(restore(f), restore(onFail))).traced(trace)
)
