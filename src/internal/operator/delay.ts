import type { Duration } from "@effect/data/Duration"
import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const delay: {
  <R, E, A>(fx: Fx<R, E, A>, duration: Duration): Fx<R, E, A>
  (duration: Duration): <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
} = dualWithTrace(
  2,
  (trace) => <R, E, A>(fx: Fx<R, E, A>, duration: Duration): Fx<R, E, A> => new DelayFx(fx, duration).traced(trace)
)

export class DelayFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "Delay" as const

  constructor(readonly fx: Fx<R, E, A>, readonly duration: Duration) {
    super()
  }

  run(sink: Sink<E, A>) {
    return this.fx.run(
      Sink(
        (a) => Effect.delay(sink.event(a), this.duration),
        sink.error,
        sink.end
      )
    )
  }
}
