import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const catchAllDefect = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(self: Fx<R, E, A>, f: (defect: unknown) => Fx<R2, E2, B>): Fx<R | R2, E | E2, A | B> =>
      new CatchAllDefectFx(self, f).traced(trace)
)

class CatchAllDefectFx<R, E, A, R2, E2, B> extends BaseFx<R | R2, E | E2, A | B> {
  readonly name = "CatchAllDefect" as const

  constructor(readonly self: Fx<R, E, A>, readonly f: (defect: unknown) => Fx<R2, E2, B>) {
    super()
  }

  run(sink: Sink<E | E2, A | B>) {
    return this.self.run(Sink(
      sink.event,
      (cause) => sink.error(cause),
      sink.end
    ))
  }
}
