import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export function suspendSucceed<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return new SuspendSucceedFx(f)
}

export class SuspendSucceedFx<R, E, A> extends BaseFx<R, E, A> {
  readonly _tag = "SuspendSucceed"

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }

  run<R2>(sink: Sink<R2, E, A>) {
    return this.f().run(sink)
  }
}
