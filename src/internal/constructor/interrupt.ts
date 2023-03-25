import { methodWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const interrupt: (_: void) => Fx<never, never, never> = methodWithTrace((trace) =>
  (_: void) => fromEffect(Effect.interrupt()).traced(trace)
)
