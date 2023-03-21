import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Cause } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const orElseFail: {
  <R, E, A, E2>(fx: Fx<R, E, A>, orFail: () => E2): Fx<R, E2, A>
  <E2>(orFail: () => E2): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E2, A>
} = dualWithTrace(
  2,
  (trace) => <R, E, A, E2>(fx: Fx<R, E, A>, orFail: () => E2) => new OrElseFailFx(fx, orFail).traced(trace)
)

export class OrElseFailFx<R, E, A, E2> extends BaseFx<R, E2, A> {
  readonly name = "OrElseFail" as const

  constructor(readonly fx: Fx<R, E, A>, readonly orFail: () => E2) {
    super()
  }

  run(sink: Sink<E2, A>) {
    return this.fx.run(
      Sink(
        sink.event,
        () => sink.error(Cause.fail(this.orFail())),
        sink.end
      )
    )
  }
}
