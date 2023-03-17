import { dualWithTrace } from "@effect/io/Debug"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Cause, Either, flow } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const absolveWith: {
  <R, E, A, E2, B>(fx: Fx<R, E, A>, f: (e: A) => Either.Either<E2, B>): Fx<R, E | E2, B>
  <A, E2, B>(f: (e: A) => Either.Either<E2, B>): <R, E>(fx: Fx<R, E, A>) => Fx<R, E | E2, B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, E2, B>(fx: Fx<R, E, A>, f: (e: A) => Either.Either<E2, B>) => new AbsolveWithFx(fx, f).traced(trace)
)

export class AbsolveWithFx<R, E, A, E2, B> extends BaseFx<R, E | E2, B> {
  readonly _tag = "AbsolveWith" as const

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly f: (e: A) => Either.Either<E2, B>
  ) {
    super()
  }

  run(sink: Sink<E | E2, B>) {
    return this.fx.run(
      Sink(
        (a) => Either.match(this.f(a), flow(Cause.fail, sink.error), sink.event),
        sink.error,
        sink.end
      )
    )
  }
}
