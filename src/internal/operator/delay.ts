import type { Duration } from "@effect/data/Duration"
import { flow } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"

export function delay(duration: Duration) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> => new DelayFx(fx, duration)
}

class DelayFx<R, E, A> implements Fx<R, E, A> {
  readonly _tag = "Delay" as const

  constructor(readonly fx: Fx<R, E, A>, readonly duration: Duration) {}

  run<R2>(sink: Sink<R2, E, A>) {
    return this.fx.run(Sink(flow(sink.event, Effect.delay(this.duration)), sink.error, sink.end))
  }
}
