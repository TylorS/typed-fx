import { type Effect, matchCauseEffect } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

export function fromFxEffect<R = never, E = never, R2 = never, E2 = never, A = never>(
  effect: Effect<R, E, Fx<R2, E2, A>>
): Fx<R | R2, E | E2, A> {
  return new FromFxEffect(effect)
}

export class FromFxEffect<R, E, R2, E2, A> implements Fx<R | R2, E | E2, A> {
  readonly _tag = "FromFxEffect" as const

  constructor(readonly effect: Effect<R, E, Fx<R2, E2, A>>) {}

  /**
   * @macro traced
   */
  run<R3>(sink: Sink<R3, E | E2, A>) {
    return matchCauseEffect(this.effect, sink.error, (fx) => fx.run(sink))
  }
}
