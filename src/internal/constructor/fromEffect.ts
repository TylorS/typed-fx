import type { Either } from "@effect/data/Either"
import { flow } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import type { Cause } from "@effect/io/Cause"
import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fiber } from "@effect/io/Fiber"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

/**
 * Construct a Fx from an Effect.
 * @since 1.0.0
 * @category Constructor
 */
export const fromEffect = methodWithTrace((trace) =>
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

export const promiseInterrupt: <A>(promise: (signal: AbortSignal) => Promise<A>) => Fx<never, unknown, A> = flow(
  Effect.promiseInterrupt,
  fromEffect
)

export const fromOption: <A>(option: Option<A>) => Fx<never, Option<never>, A> = flow(
  Effect.fromOption,
  fromEffect
)

export const fromEither: <E, A>(either: Either<E, A>) => Fx<never, E, A> = flow(Effect.fromEither, fromEffect)

export const fromEitherCause: <E, A>(either: Either<Cause<E>, A>) => Fx<never, E, A> = flow(
  Effect.fromEitherCause,
  fromEffect
)

export const fromFiber: <Errors, Output>(fiber: Fiber<Errors, Output>) => Fx<never, Errors, Output> = flow(
  Effect.fromFiber,
  fromEffect
)

export const fromFiberEffect: <Services, Errors, Output>(
  fiber: Effect.Effect<Services, Errors, Fiber<Errors, Output>>
) => Fx<Services, Errors, Output> = flow(Effect.fromFiberEffect, fromEffect)
