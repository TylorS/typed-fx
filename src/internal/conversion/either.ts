import { methodWithTrace } from "@effect/data/Debug"
import { pipe } from "@effect/data/Function"
import * as Either from "@effect/data/Either"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import { Sink } from "@typed/fx/internal/Fx"
import type { Fx } from "@typed/fx/internal/Fx"
import { Cause } from "@typed/fx/internal/_externals"

export const either: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, never, Either.Either<E, A>> = methodWithTrace((trace) =>
  (fx) => new EitherFx(fx).traced(trace)
)

export class EitherFx<R, E, A> extends BaseFx<R, never, Either.Either<E, A>> {
  readonly name = "Either"

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<never, Either.Either<E, A>>) {
    return this.fx.run(Sink(
      (a) => pipe(a, Either.right, sink.event),
      (e) => pipe(e, Cause.failureOrCause, Either.match(
        (e) => pipe(e, Either.left, sink.event),
        sink.error,
      )),
      sink.end
    ))
  }
}
