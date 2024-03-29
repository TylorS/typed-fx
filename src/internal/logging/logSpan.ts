import { dualWithTrace } from "@effect/data/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const logSpan: {
  <R, E, A>(fx: Fx<R, E, A>, span: string): Fx<R, E, A>
  (span: string): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) => <R, E, A>(fx: Fx<R, E, A>, span: string): Fx<R, E, A> => fx.transform(Effect.logSpan(span)).traced(trace)
)
