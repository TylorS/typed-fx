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

import { Fx } from './Fx.js'

export function fromEffect<R, E, A>(effect: Effect.Effect<R, E, A>): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      effect,
      Effect.foldCauseEffect(emitter.failCause, flow(emitter.emit, Effect.zipRight(emitter.end))),
    ),
  )
}

export const succeed = flow(Effect.succeed, fromEffect)

export const failCause: <E>(cause: Cause.Cause<E>) => Fx<never, E, never> = flow(
  Effect.failCause,
  fromEffect,
)

export const fail: <E>(e: E) => Fx<never, E, never> = flow(Effect.fail, fromEffect)

export const unit: Fx<never, never, void> = fromEffect(Effect.unit)

export const never: Fx<never, never, never> = fromEffect(Effect.never)

export const interrupt = fromEffect(Effect.interrupt)
export const interruptAs: (fiberId: FiberId) => Fx<never, never, never> = flow(
  Effect.interruptAs,
  fromEffect,
)

export const die = flow(Effect.die, fromEffect)
export const dieMessage = flow(Effect.dieMessage, fromEffect)
export const dieSync: <A>(f: LazyArg<A>) => Fx<never, never, never> = flow(
  Effect.dieSync,
  fromEffect,
)

export const done: <E, A>(exit: Exit<E, A>) => Fx<never, E, A> = flow(Effect.done, fromEffect)

export const fromEither: <E, A>(either: Either<E, A>) => Fx<never, E, A> = flow(
  Effect.fromEither,
  fromEffect,
)

export const succeedLeft: <A>(value: A) => Fx<never, never, Either<A, never>> = flow(
  Effect.succeedLeft,
  fromEffect,
)

export const succeedRight: <A>(value: A) => Fx<never, never, Either<never, A>> = flow(
  Effect.succeedRight,
  fromEffect,
)

export const yieldNow = fromEffect(Effect.yieldNow)

export const tryPromise: <A>(promise: LazyArg<Promise<A>>) => Fx<never, unknown, A> = flow(
  Effect.tryPromise,
  fromEffect,
)

export const tryCatchPromise: <A, E>(
  promise: LazyArg<Promise<A>>,
  onThrow: (u: unknown) => E,
) => Fx<never, E, A> = flow(Effect.tryPromise, fromEffect)

export const tryCatch: <A, E>(f: LazyArg<A>, onThrow: (u: unknown) => E) => Fx<never, E, A> = flow(
  Effect.tryCatch,
  fromEffect,
)

export const sync: <A>(f: LazyArg<A>) => Fx<never, never, A> = flow(Effect.sync, fromEffect)

export const async = flow(Effect.async, fromEffect)

export const asyncEffect = flow(Effect.asyncEffect, fromEffect)

export const asyncInterrupt = flow(Effect.asyncInterrupt, fromEffect)

export const asyncMaybe: <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Maybe<Effect.Effect<R, E, A>>,
) => Fx<R, E, A> = flow(Effect.asyncMaybe, fromEffect)

export const clock: Fx<never, never, Clock> = fromEffect(Effect.clock)

export const environment = <R>(): Fx<R, never, Env<R>> => fromEffect(Effect.environment<R>())

export const service = <R>(tag: Tag<R>): Fx<R, never, R> => fromEffect(Effect.service<R>(tag))

export const environmentWith = flow(Effect.environmentWith, fromEffect)
export const environmentWithEffect = flow(Effect.environmentWithEffect, fromEffect)

export const descriptor: Fx<never, never, Fiber.Descriptor> = fromEffect(Effect.descriptor)

export const descriptorWith = flow(Effect.descriptorWith, fromEffect)

export const fromFiber = flow(Effect.fromFiber, fromEffect)
export const fromFiberEffect = flow(Effect.fromFiberEffect, fromEffect)

export const fromMaybe = flow(Effect.fromMaybe, fromEffect)
