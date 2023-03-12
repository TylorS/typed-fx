import type { Fx } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Debug, Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const serviceWithEffect: {
  <A, R2, E2, B>(tag: Context.Tag<A>, f: (a: A) => Effect.Effect<R2, E2, B>): Fx<R2 | A, E2, B>
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): (tag: Context.Tag<A>) => Fx<R2 | A, E2, B>
} = Debug.dualWithTrace(
  2,
  (trace) =>
    <A, R2, E2, B>(tag: Context.Tag<A>, f: (a: A) => Effect.Effect<R2, E2, B>) =>
      fromEffect(Effect.serviceWithEffect(tag, f)).traced(trace)
)
