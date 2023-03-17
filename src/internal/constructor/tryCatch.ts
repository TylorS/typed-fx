import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const tryCatch: <A, E>(
  f: () => A,
  onFail: (error: unknown) => E
) => Fx<never, E, A> = methodWithTrace((
  trace,
  restore
) =>
  <A, E>(f: () => A, onFail: (error: unknown) => E) =>
    fromEffect(Effect.tryCatch(restore(f), restore(onFail))).transform((e) => e.traced(trace))
)
