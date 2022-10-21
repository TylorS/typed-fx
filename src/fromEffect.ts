import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { LazyArg, flow, pipe } from '@fp-ts/data/Function'
import { Either } from '@tsplus/stdlib/data/Either'
import { Maybe } from '@tsplus/stdlib/data/Maybe'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R, E, A> {
  return new FromEffectFx(effect)
}

export class FromEffectFx<R, E, A> implements Fx<R, E, A> {
  constructor(readonly effect: Effect.Effect<R, E, A>) {}

  run<R2, E2, B>(sink: Sink<E, A, R2, E2, B>): Effect.Effect<R | R2, E2, B> {
    return pipe(
      this.effect,
      Effect.foldCauseEffect(sink.error, flow(sink.event, Effect.zipRight(sink.end))),
    )
  }
}

export const succeed = flow(Effect.succeed, fromEffect)

export const fail = flow(Effect.fail, fromEffect)

export const failCause: <E>(cause: Cause.Cause<E>) => Fx<never, E, never, never> = flow(
  Effect.failCause,
  fromEffect,
)

export const async = flow(Effect.async, fromEffect)

export const asyncEffect = flow(Effect.asyncEffect, fromEffect)

export const asyncInterrupt: <R, E, A>(
  register: (
    callback: (_: Effect.Effect<R, E, A>) => void,
  ) => Either<Effect.Effect<R, never, void>, Effect.Effect<R, E, A>>,
) => Fx<R, E, A> = flow(Effect.asyncInterrupt, fromEffect)

export const asyncMaybe: <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Maybe<Effect.Effect<R, E, A>>,
) => Fx<R, E, A> = flow(Effect.asyncMaybe, fromEffect)

export const suspendSucceedEffect: <R, E, A>(
  effect: LazyArg<Effect.Effect<R, E, A>>,
) => Fx<R, E, A> = flow(Effect.suspendSucceed, fromEffect)
