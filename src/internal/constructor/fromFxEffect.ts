import { methodWithTrace } from "@effect/io/Debug"
import { type Effect, matchCauseEffect } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const fromFxEffect: <R, E, R2 = never, E2 = never, A = unknown>(
  effect: Effect<R, E, Fx<R2, E2, A>>
) => Fx<R | R2, E | E2, A> = methodWithTrace((trace) =>
  <R, E, R2 = never, E2 = never, A = unknown>(effect: Effect<R, E, Fx<R2, E2, A>>) =>
    new FromFxEffect(effect).traced(trace)
)

export class FromFxEffect<R, E, R2, E2, A> extends BaseFx<R | R2, E | E2, A> {
  readonly _tag = "FromFxEffect" as const

  constructor(readonly effect: Effect<R, E, Fx<R2, E2, A>>) {
    super()
  }

  /**
   * @macro traced
   */
  run<R3>(sink: Sink<R3, E | E2, A>) {
    return matchCauseEffect(this.effect, sink.error, (fx) => fx.run(sink))
  }
}
