import type * as HashMap from "@effect/data/HashMap"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const logAnnotations: (
  _: void
) => Fx<never, never, HashMap.HashMap<string, string>> = methodWithTrace(
  (trace) => (_: void) => fromEffect(Effect.logAnnotations()).traced(trace)
)
