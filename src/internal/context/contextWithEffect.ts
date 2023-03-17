import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const contextWithEffect: <R, R2, E2, A>(
  f: (context: Context.Context<R>) => Effect.Effect<R2, E2, A>
) => Fx<R | R2, E2, A> = bodyWithTrace((
  trace
) => (f) => fromEffect(Effect.contextWithEffect(f)).transform((e) => e.traced(trace)))
