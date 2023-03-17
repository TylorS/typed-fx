import * as Cause from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const sandbox: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, Cause.Cause<E>, A> = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, Cause.Cause<E>, A> => new SandboxFx(fx).transform((e) => e.traced(trace))
)

export class SandboxFx<R, E, A> extends BaseFx<R, Cause.Cause<E>, A> {
  readonly name = "Sandbox"

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<Cause.Cause<E>, A>) {
    return this.fx.run(Sink(
      sink.event,
      (cause) => sink.error(Cause.fail(cause)),
      sink.end
    ))
  }
}
