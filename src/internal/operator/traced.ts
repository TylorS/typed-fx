import { dual } from "@effect/data/Function"
import type { Trace } from "@effect/io/Debug"
import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { Fx, Sink } from "@typed/fx/Fx"

export const traced: {
  <R, E, A>(fx: Fx<R, E, A>, trace: Trace): Fx<R, E, A>
  (trace: Trace): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dual(2, <R, E, A>(fx: Fx<R, E, A>, trace: Trace): Fx<R, E, A> => new Traced(fx, trace))

export class Traced<R, E, A> implements Fx<R, E, A> {
  readonly _tag = "Traced"
  constructor(readonly fx: Fx<R, E, A>, readonly trace: Trace) {}

  run(sink: Sink<E, A>): Effect<R | Scope, never, void> {
    const { fx, trace } = this

    return fx.run(sink).traced(trace)
  }

  traced(trace: Trace): Fx<R, E, A> {
    return trace ? new Traced(this.fx, trace) : this
  }
}
