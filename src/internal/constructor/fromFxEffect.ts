import { type Effect, matchCauseEffect } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

export function fromFxEffect<R, E, R2, E2, A>(
  effect: Effect<R, E, Fx<R2, E2, A>>
): Fx<R | R2, E | E2, A> {
  return new FxEffect(effect)
}

export class FxEffect<R, E, R2, E2, A> implements Fx<R | R2, E | E2, A> {
  constructor(readonly effect: Effect<R, E, Fx<R2, E2, A>>) {}

  run<R3>(sink: Sink<R3, E | E2, A>) {
    return matchCauseEffect(this.effect, sink.error, (fx) => fx.run(sink))
  }
}
