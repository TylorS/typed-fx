import { dualWithTrace } from "@effect/io/Debug"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const logAnnotate: {
  <R, E, A>(fx: Fx<R, E, A>, k: string, value: string): Fx<R, E, A>
  (k: string, value: string): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  3,
  (trace) =>
    <R, E, A>(fx: Fx<R, E, A>, k: string, value: string): Fx<R, E, A> =>
      fx.transform(Effect.logAnnotate(k, value)).traced(trace)
)
