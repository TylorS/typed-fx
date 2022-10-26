import * as Cause from '@effect/core/io/Cause'
import { Clock } from '@effect/core/io/Clock'
import * as Effect from '@effect/core/io/Effect'
import { Exit } from '@effect/core/io/Exit'
import { Fiber } from '@effect/core/io/Fiber'
import { FiberId } from '@effect/core/io/FiberId'
import { LazyArg, flow, pipe } from '@fp-ts/data/Function'
import { Either } from '@tsplus/stdlib/data/Either'
import { Maybe } from '@tsplus/stdlib/data/Maybe'
import { Env } from '@tsplus/stdlib/service/Env'
import { Tag } from '@tsplus/stdlib/service/Tag'

import { Push } from './Push.js'

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Push<R, E, A> {
  return Push((emitter) =>
    pipe(
      effect,
      Effect.foldCauseEffect(emitter.failCause, flow(emitter.emit, Effect.zipRight(emitter.end))),
    ),
  )
}

export const succeed = flow(Effect.succeed, fromEffect)

export const failCause: <E>(cause: Cause.Cause<E>) => Push<never, E, never> = flow(
  Effect.failCause,
  fromEffect,
)

export const fail: <E>(e: E) => Push<never, E, never> = flow(Effect.fail, fromEffect)

export const unit: Push<never, never, void> = fromEffect(Effect.unit)

export const never: Push<never, never, never> = fromEffect(Effect.never)

export const interrupt = fromEffect(Effect.interrupt)
export const interruptAs: (fiberId: FiberId) => Push<never, never, never> = flow(
  Effect.interruptAs,
  fromEffect,
)

export const die = flow(Effect.die, fromEffect)
export const dieMessage = flow(Effect.dieMessage, fromEffect)
export const dieSync: <A>(f: LazyArg<A>) => Push<never, never, never> = flow(
  Effect.dieSync,
  fromEffect,
)

export const done: <E, A>(exit: Exit<E, A>) => Push<never, E, A> = flow(Effect.done, fromEffect)

export const fromEither: <E, A>(either: Either<E, A>) => Push<never, E, A> = flow(
  Effect.fromEither,
  fromEffect,
)

export const succeedLeft: <A>(value: A) => Push<never, never, Either<A, never>> = flow(
  Effect.succeedLeft,
  fromEffect,
)

export const succeedRight: <A>(value: A) => Push<never, never, Either<never, A>> = flow(
  Effect.succeedRight,
  fromEffect,
)

export const yieldNow = fromEffect(Effect.yieldNow)

export const tryPromise: <A>(promise: LazyArg<Promise<A>>) => Push<never, unknown, A> = flow(
  Effect.tryPromise,
  fromEffect,
)

export const tryCatchPromise: <A, E>(
  promise: LazyArg<Promise<A>>,
  onThrow: (u: unknown) => E,
) => Push<never, E, A> = flow(Effect.tryPromise, fromEffect)

export const tryCatch: <A, E>(f: LazyArg<A>, onThrow: (u: unknown) => E) => Push<never, E, A> =
  flow(Effect.tryCatch, fromEffect)

export const sync: <A>(f: LazyArg<A>) => Push<never, never, A> = flow(Effect.sync, fromEffect)

export const async = flow(Effect.async, fromEffect)

export const asyncEffect = flow(Effect.asyncEffect, fromEffect)

export const asyncInterrupt = flow(Effect.asyncInterrupt, fromEffect)

export const asyncMaybe: <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Maybe<Effect.Effect<R, E, A>>,
) => Push<R, E, A> = flow(Effect.asyncMaybe, fromEffect)

export const clock: Push<never, never, Clock> = fromEffect(Effect.clock)

export const environment = <R>(): Push<R, never, Env<R>> => fromEffect(Effect.environment<R>())

export const service = <R>(tag: Tag<R>): Push<R, never, R> => fromEffect(Effect.service<R>(tag))

export const environmentWith = flow(Effect.environmentWith, fromEffect)
export const environmentWithEffect = flow(Effect.environmentWithEffect, fromEffect)

export const descriptor: Push<never, never, Fiber.Descriptor> = fromEffect(Effect.descriptor)

export const descriptorWith = flow(Effect.descriptorWith, fromEffect)

export const fromFiber = flow(Effect.fromFiber, fromEffect)
export const fromFiberEffect = flow(Effect.fromFiberEffect, fromEffect)

export const fromMaybe = flow(Effect.fromMaybe, fromEffect)
