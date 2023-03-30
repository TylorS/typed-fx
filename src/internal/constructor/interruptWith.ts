import { methodWithTrace } from "@effect/data/Debug"
import type { FiberId } from "@effect/io/Fiber/Id"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const interruptWith: (id: FiberId) => Fx<never, never, never> = methodWithTrace((trace) =>
  (id: FiberId) => fromEffect(Effect.interruptWith(id)).traced(trace)
)
