import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Fx.WithService<R, A> = bodyWithTrace((
  trace
) =>
  <R, A>(f: (context: Context.Context<R>) => A) => fromEffect(Effect.contextWith(f)).transform((e) => e.traced(trace))
)
