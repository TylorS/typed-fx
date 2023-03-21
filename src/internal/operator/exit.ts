import { pipe } from "@effect/data/Function"
import { methodWithTrace } from "@effect/io/Debug"
import * as Exit from "@effect/io/Exit"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const exit: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, never, Exit.Exit<E, A>> = methodWithTrace((trace) =>
  (fx) => new ExitFx(fx).traced(trace)
)

export class ExitFx<R, E, A> extends BaseFx<R, never, Exit.Exit<E, A>> {
  readonly name = "Exit"

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<never, Exit.Exit<E, A>>) {
    return this.fx.run(Sink(
      (a) => pipe(a, Exit.succeed, sink.event),
      (e) => pipe(e, Exit.failCause, sink.event),
      sink.end
    ))
  }
}
