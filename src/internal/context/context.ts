import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const context: <R>() => Fx.WithService<R, Context.Context<R>> = bodyWithTrace((trace) =>
  <R>() => fromEffect(Effect.context<R>()).traced(trace)
)
