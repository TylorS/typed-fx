import { not } from "@effect/data/Predicate"
import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { skipWhile } from "@typed/fx/internal/slicing/skipWhile"

export const skipUntil: {
  <R, E, A>(self: Fx<R, E, A>, predicate: (value: A) => boolean): Fx<R, E, A>
  <A>(predicate: (value: A) => boolean): <R, E>(self: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, predicate: (value: A) => boolean) => skipWhile(self, not(predicate)).traced(trace)
)
