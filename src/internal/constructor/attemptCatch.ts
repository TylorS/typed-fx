import { methodWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const attemptCatch: <A, E>(
  f: () => A,
  onFail: (error: unknown) => E
) => Fx<never, E, A> = methodWithTrace((
  trace,
  restore
) =>
  <A, E>(f: () => A, onFail: (error: unknown) => E) =>
    fromEffect(Effect.attemptCatch(restore(f), restore(onFail))).traced(trace)
)
