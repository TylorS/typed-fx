import { methodWithTrace } from "@effect/data/Debug"
import { fail } from "@effect/io/Cause"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"

export const attemptSuspend: <R, E, A>(f: () => Fx<R, E, A>) => Fx<R, unknown, A> = methodWithTrace((trace) =>
  <R, E, A>(f: () => Fx<R, E, A>): Fx<R, unknown, A> => new AttemptSuspendFx(f).traced(trace)
)

export class AttemptSuspendFx<R, E, A> extends BaseFx<R, unknown, A> {
  readonly name = "AttemptSuspend"

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<unknown, A>) {
    try {
      return this.f().run(sink)
    } catch (e) {
      return sink.error(fail(e))
    }
  }
}
