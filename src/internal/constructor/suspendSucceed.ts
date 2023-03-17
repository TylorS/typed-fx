import { methodWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const suspendSucceed: <R, E, A>(f: () => Fx<R, E, A>) => Fx<R, E, A> = methodWithTrace((trace) =>
  <R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> => new SuspendSucceedFx(f).transform((e) => e.traced(trace))
)

export class SuspendSucceedFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "SuspendSucceed"

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<E, A>) {
    return this.f().run(sink)
  }
}
