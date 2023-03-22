import { pipe } from "@effect/data/Function"
import { methodWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { Cause, Either } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const flip = methodWithTrace(
  (trace) => <R, E, A>(self: Fx<R, E, A>) => new FlipFx(self).traced(trace)
)

export class FlipFx<R, E, A> extends BaseFx<R, A, E> {
  readonly name = "Flip"

  constructor(readonly self: Fx<R, E, A>) {
    super()
  }

  run(sink: Sink<A, E>) {
    return this.self.run(
      Sink(
        (value) => sink.error(Cause.fail(value)),
        (cause) =>
          pipe(
            Cause.failureOrCause(cause),
            Either.match(
              (failure) => sink.event(failure),
              (cause) => sink.error(cause)
            )
          ),
        sink.end
      )
    )
  }
}
