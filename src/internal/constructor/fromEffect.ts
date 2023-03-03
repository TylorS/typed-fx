import { flow } from "@effect/data/Function"
import type { Cause } from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

/**
 * Construct a Fx from an Effect.
 * @since 1.0.0
 * @category Constructor
 */
export function fromEffect<Services, Errors, Output>(
  effect: Effect.Effect<Services, Errors, Output>
): Fx<Services, Errors, Output> {
  return new FromEffect(effect)
}

/**
 * @internal
 */
export class FromEffect<Services, Errors, Output> implements Fx<Services, Errors, Output> {
  readonly _tag = "FromEffect"
  constructor(readonly effect: Effect.Effect<Services, Errors, Output>) {}

  run<Services2>(sink: Sink<Services2, Errors, Output>) {
    return Effect.matchCauseEffect(this.effect, sink.error, flow(sink.event, Effect.zipRight(sink.end)))
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

export const succeed: <A>(value: A) => Fx<never, never, A> = flow(Effect.succeed, fromEffect)

export const fail: <E>(error: E) => Fx<never, E, never> = flow(Effect.fail, fromEffect)

export const failCause: <E>(cause: Cause<E>) => Fx<never, E, never> = flow(Effect.failCause, fromEffect)

export const promise: <A>(promise: () => Promise<A>) => Fx<never, unknown, A> = flow(Effect.promise, fromEffect)
