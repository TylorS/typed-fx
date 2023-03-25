import * as Cause from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import { Sink } from "@typed/fx/internal/Fx"
import type { Fx } from "@typed/fx/internal/Fx"

export const cause: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, never, Cause.Cause<E>> = methodWithTrace((trace) =>
  (fx) => new CauseFx(fx).traced(trace)
)

export class CauseFx<R, E, A> extends BaseFx<R, never, Cause.Cause<E>> {
  readonly name = "Cause"

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<never, Cause.Cause<E>>) {
    return this.fx.run(Sink(
      () => sink.event(Cause.empty),
      (e) => sink.event(e),
      sink.end
    ))
  }
}
