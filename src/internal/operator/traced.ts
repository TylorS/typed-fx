import { dual } from "@effect/data/Function"
import type { Trace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"

export const traced: {
  <R, E, A>(fx: Fx<R, E, A>, trace: Trace): Fx<R, E, A>
  (trace: Trace): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dual(2, <R, E, A>(fx: Fx<R, E, A>, trace: Trace): Fx<R, E, A> => fx.transform((e) => e.traced(trace)))
