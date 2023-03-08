import { flow } from "@effect/data/Function"
import { methodWithTrace } from "@effect/io/Debug"
import * as Exit from "@effect/io/Exit"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const exit: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, never, Exit.Exit<E, A>> = methodWithTrace((trace) =>
  (fx) => new ExitFx(fx).traced(trace)
)

export class ExitFx<R, E, A> extends BaseFx<R, never, Exit.Exit<E, A>> {
  readonly _tag = "Exit"

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }

  run<R2>(sink: Sink<R2, never, Exit.Exit<E, A>>) {
    return this.fx.run(Sink(
      flow(Exit.succeed, sink.event),
      flow(Exit.failCause, sink.event),
      sink.end
    ))
  }
}
