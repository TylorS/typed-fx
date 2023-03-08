import { flow } from "@effect/data/Function"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

/**
 * Construct a Fx from an Effect.
 * @since 1.0.0
 * @category Constructor
 */
export const fromEffect: <Services, Errors, Output>(
  effect: Effect.Effect<Services, Errors, Output>
) => Fx<Services, Errors, Output> = methodWithTrace((trace) =>
  <Services, Errors, Output>(
    effect: Effect.Effect<Services, Errors, Output>
  ): Fx<Services, Errors, Output> => new FromEffect(effect).traced(trace)
)

export class FromEffect<Services, Errors, Output> extends BaseFx<Services, Errors, Output> {
  readonly _tag = "FromEffect" as const

  constructor(readonly effect: Effect.Effect<Services, Errors, Output>) {
    super()
  }

  run<Services2>(sink: Sink<Services2, Errors, Output>) {
    return Effect.matchCauseEffect(this.effect, sink.error, flow(sink.event, Effect.flatMap(sink.end)))
  }
}

/**
 * Type guard for FromEffect.
 * @since 1.0.0
 * @category Type Guard
 */
export function isFromEffect<Services, Errors, Output>(
  fx: Fx<Services, Errors, Output>
): fx is FromEffect<Services, Errors, Output> {
  return fx instanceof FromEffect
}
