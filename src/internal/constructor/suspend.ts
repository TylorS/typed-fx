import { fail } from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const suspend: <R, E, A>(f: () => Fx<R, E, A>) => Fx<R, unknown, A> = methodWithTrace((trace) =>
  <R, E, A>(f: () => Fx<R, E, A>): Fx<R, unknown, A> => new SuspendFx(f).traced(trace)
)

export class SuspendFx<R, E, A> extends BaseFx<R, unknown, A> {
  readonly _tag = "Suspend"

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
