import { flow } from "@effect/data/Function"
import { type Effect, matchCauseEffect, zipRight } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

/**
 * Construct a Fx from an Effect.
 * @since 1.0.0
 * @category Constructor
 */
export function fromEffect<Services, Errors, Output>(
  effect: Effect<Services, Errors, Output>
): Fx<Services, Errors, Output> {
  return new FromEffect(effect)
}

/**
 * @internal
 */
export class FromEffect<Services, Errors, Output> implements Fx<Services, Errors, Output> {
  readonly _tag = "FromEffect"
  constructor(readonly effect: Effect<Services, Errors, Output>) {}

  run<Services2>(sink: Sink<Services2, Errors, Output>) {
    return matchCauseEffect(this.effect, sink.error, flow(sink.event, zipRight(sink.end)))
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
  return fx._tag === "FromEffect"
}
