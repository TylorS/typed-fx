import * as Either from "@effect/data/Either"
import * as Cause from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const absolve = methodWithTrace((trace) =>
  <R, E, E2, A>(fx: Fx<R, E, Either.Either<E2, A>>) => new AbsolveFx(fx).traced(trace)
)

export class AbsolveFx<R, E, E2, A> extends BaseFx<R, E | E2, A> {
  readonly _tag = "Absolve"

  constructor(readonly fx: Fx<R, E, Either.Either<E2, A>>) {
    super()
  }

  run<R2>(sink: Sink<R2, E | E2, A>) {
    return this.fx.run(Sink(
      Either.match((e2) => sink.error(Cause.fail(e2)), sink.event),
      sink.error,
      sink.end
    ))
  }
}
