import { dualWithTrace } from "@effect/io/Debug"
import type * as Supervisor from "@effect/io/Supervisor"
import { Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"

export const supervised: {
  <X>(supervisor: Supervisor.Supervisor<X>): <R, E, A>(self: Fx<R, E, A>) => Fx<R, E, A>
  <R, E, A, X>(self: Fx<R, E, A>, supervisor: Supervisor.Supervisor<X>): Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, X>(self: Fx<R, E, A>, supervisor: Supervisor.Supervisor<X>) =>
      self.transform((e) => Effect.supervised(e, supervisor)).traced(trace)
)
