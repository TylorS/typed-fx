import type { Fx } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Debug, Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/conversion/fromEffect"

export const serviceWith: {
  <A, B>(
    tag: Context.Tag<A>,
    f: (a: A) => B
  ): Fx<A, never, B>

  <A, B>(
    f: (a: A) => B
  ): (tag: Context.Tag<A>) => Fx<A, never, B>
} = Debug.dualWithTrace(
  2,
  (trace) =>
    <A, B>(tag: Context.Tag<A>, f: (a: A) => B) =>
      fromEffect(Effect.serviceWith(tag, f)).transform((e) => e.traced(trace))
)
