import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'
import { FiberId } from '@effect/core/io/FiberId'
import { flow, pipe } from '@fp-ts/data/Function'
import { Either } from '@tsplus/stdlib/data/Either'
import { Maybe } from '@tsplus/stdlib/data/Maybe'

import { Sink } from '@/Sink/Sink.js'

export interface Stream<R, E, A, E2 = never> {
  readonly fork: <R3, E3, B>(
    sink: Sink<E, A, R3, E3, B>,
  ) => Effect.Effect<R | R3, never, Fiber<E2 | E3, B>>
}

export function Stream<R, E, A, E2 = never>(
  fork: Stream<R, E, A, E2>['fork'],
): Stream<R, E, A, E2> {
  return { fork }
}

export namespace Stream {
  export type ResourcesOf<T> = T extends Stream<infer R, any, any> ? R : never
  export type ErrorsOf<T> = T extends Stream<any, infer R, any> ? R : never
  export type OutputOf<T> = T extends Stream<any, any, infer R> ? R : never
}

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Stream<R, E, A> {
  return Stream((sink) =>
    pipe(
      effect,
      Effect.foldCauseEffect(sink.error, (a) =>
        pipe(
          a,
          sink.event,
          Effect.flatMap(() => sink.end),
        ),
      ),
      Effect.fork,
    ),
  )
}

export const succeed = flow(Effect.succeed, fromEffect)

export const fromEither: <E, A>(either: Either<E, A>) => Stream<never, E, A, never> = flow(
  Effect.fromEither,
  fromEffect,
)

export const async = flow(Effect.async, fromEffect)

export const asyncEffect = flow(Effect.asyncEffect, fromEffect)

export const asyncMaybe: <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Maybe<Effect.Effect<R, E, A>>,
) => Stream<R, E, A> = flow(Effect.asyncMaybe, fromEffect)

export const fromEitherCause = flow(Effect.fromEitherCause, fromEffect)

export const failCause: <E>(cause: Cause<E>) => Stream<never, E, never> = flow(
  Effect.failCause,
  fromEffect,
)

export const fail: <E>(error: E) => Stream<never, E, never> = flow(Effect.fail, fromEffect)

export const die = flow(Effect.die, fromEffect)

export const interruptAs: (id: FiberId) => Stream<never, never, never> = flow(
  Effect.interruptAs,
  fromEffect,
)

export const fromFiber = flow(Effect.fromFiber, fromEffect)
export const fromFiberEffect = flow(Effect.fromFiberEffect, fromEffect)
