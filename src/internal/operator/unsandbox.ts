import { methodWithTrace } from "@effect/data/Debug"
import { Cause, Either, pipe } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx } from "@typed/fx/internal/Fx"
import { Sink } from "@typed/fx/internal/Fx"

export const unsandbox: <R, E, A>(fx: Fx<R, Cause.Cause<E>, A>) => Fx<R, E, A> = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, Cause.Cause<E>, A>) => new UnsandboxFx(fx).traced(trace)
)

export class UnsandboxFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "Unsandbox"

  constructor(readonly fx: Fx<R, Cause.Cause<E>, A>) {
    super()
  }

  run(sink: Sink<E, A>) {
    return this.fx.run(Sink(
      sink.event,
      (cause) =>
        pipe(
          cause,
          Cause.failureOrCause,
          Either.match(
            sink.error,
            sink.error
          )
        ),
      sink.end
    ))
  }
}
