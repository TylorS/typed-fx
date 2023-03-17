import { methodWithTrace } from "@effect/io/Debug"
import { type Effect, matchCauseEffect, uninterruptible } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import type { Scope } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const fromFxEffect: <R, E, R2 = never, E2 = never, A = unknown>(
  effect: Effect<R, E, Fx<R2, E2, A>>
) => Fx<Exclude<R, Scope.Scope> | R2, E | E2, A> = methodWithTrace((trace) =>
  <R, E, R2 = never, E2 = never, A = unknown>(effect: Effect<R, E, Fx<R2, E2, A>>) =>
    new FromFxEffect(effect).traced(trace)
)

export class FromFxEffect<R, E, R2, E2, A> extends BaseFx<Exclude<R, Scope.Scope> | R2, E | E2, A> {
  readonly _tag = "FromFxEffect" as const

  constructor(readonly effect: Effect<R, E, Fx<R2, E2, A>>) {
    super()
  }

  /**
   * @macro traced
   */
  run(sink: Sink<E | E2, A>) {
    // Ensure this.effect is uninterruptible, to ensure it can add any necessary resources to the Scope
    return matchCauseEffect(uninterruptible(this.effect), sink.error, (fx) => fx.run(sink)) as any
  }
}
