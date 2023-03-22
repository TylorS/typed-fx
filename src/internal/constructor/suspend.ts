import { methodWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const suspend: <R, E, A>(f: () => Fx<R, E, A>) => Fx<R, E, A> = methodWithTrace((trace) =>
  <R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> => new SuspendFx(f).traced(trace)
)

export class SuspendFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "Suspend"

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<E, A>) {
    return this.f().run(sink)
  }
}
