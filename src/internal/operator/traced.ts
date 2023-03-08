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

  run<R2>(sink: Sink<R2, E, A>): Effect<R | R2 | Scope, never, void> {
    return this.fx.run(sink.traced(this.trace)).traced(this.trace)
  }

  traced(trace: Trace): Fx<R, E, A> {
    return new Traced(this.fx, trace)
  }
}
