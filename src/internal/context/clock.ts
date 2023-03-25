import type { Clock } from "@effect/io/Clock"
import { bodyWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"
import type { Fx } from "@typed/fx/internal/Fx"

export const clock: (_: void) => Fx.WithService<Clock, Clock> = bodyWithTrace((trace) =>
  (_: void) => fromEffect(Effect.clock()).traced(trace)
)
