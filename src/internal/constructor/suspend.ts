import { die } from "@effect/io/Cause"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export function suspend<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return new SuspendFx(f)
}

export class SuspendFx<R, E, A> extends BaseFx<R, E, A> {
  readonly _tag = "Suspend"

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }

  run<R2>(sink: Sink<R2, E, A>) {
    try {
      return this.f().run(sink)
    } catch (e) {
      return sink.error(die(e))
    }
  }
}
