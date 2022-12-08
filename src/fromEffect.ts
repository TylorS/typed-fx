import { Cause, Clock, Context, Effect, Either, Exit, Fiber, Option, flow, pipe } from 'effect'

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

export const unit: Fx<never, never, void> = fromEffect(Effect.unit())

export const never: Fx<never, never, never> = fromEffect(Effect.never())

export const interrupt = fromEffect(Effect.interrupt())
export const interruptWith: (fiberId: Fiber.Id.FiberId) => Fx<never, never, never> = flow(
  Effect.interruptWith,
  fromEffect,
)

export const die = flow(Effect.die, fromEffect)
export const dieMessage = flow(Effect.dieMessage, fromEffect)
export const dieSync: <A>(f: () => A) => Fx<never, never, never> = flow(Effect.dieSync, fromEffect)

export const done: <E, A>(exit: Exit.Exit<E, A>) => Fx<never, E, A> = flow(Effect.done, fromEffect)

export const fromEither = <E, A>(either: Either.Either<E, A>): Fx<never, E, A> =>
  fromEffect(Effect.fromEither(either))

export const succeedLeft: <A>(value: A) => Fx<never, never, Either.Either<A, never>> = flow(
  Effect.succeedLeft,
  fromEffect,
)

export const succeedRight: <A>(value: A) => Fx<never, never, Either.Either<never, A>> = flow(
  Effect.succeedRight,
  fromEffect,
)

export const yieldNow = fromEffect(Effect.yieldNow())

export const tryPromise: <A>(promise: () => Promise<A>) => Fx<never, unknown, A> = flow(
  Effect.tryPromise,
  fromEffect,
)

export const tryCatchPromise = <A, E>(
  promise: () => Promise<A>,
  onThrow: (u: unknown) => E,
): Fx<never, E, A> => fromEffect(Effect.tryCatchPromise(promise, onThrow))

export const tryCatch: <A, E>(f: () => A, onThrow: (u: unknown) => E) => Fx<never, E, A> = flow(
  Effect.tryCatch,
  fromEffect,
)

export const sync: <A>(f: () => A) => Fx<never, never, A> = flow(Effect.sync, fromEffect)

export const async = flow(Effect.async, fromEffect)

export const asyncEffect = flow(Effect.asyncEffect, fromEffect)

export const asyncInterrupt = flow(Effect.asyncInterrupt, fromEffect)

export const asyncOption: <R, E, A>(
  register: (
    callback: (_: Effect.Effect<R, E, A>) => void,
  ) => Option.Option<Effect.Effect<R, E, A>>,
) => Fx<R, E, A> = flow(Effect.asyncOption, fromEffect)

export const clock: Fx<never, never, Clock.Clock> = fromEffect(Effect.clock())

export const environment = <R>(): Fx<R, never, Context.Context<R>> =>
  fromEffect(Effect.environment<R>())

export const service = <R>(tag: Context.Tag<R>): Fx<R, never, R> =>
  fromEffect(Effect.service<R>(tag))

export const environmentWith = flow(Effect.environmentWith, fromEffect)
export const environmentWithEffect = flow(Effect.environmentWithEffect, fromEffect)

export const descriptor: Fx<never, never, Fiber.Fiber.Descriptor> = fromEffect(Effect.descriptor())

export const descriptorWith = flow(Effect.descriptorWith, fromEffect)

export const fromFiber = flow(Effect.fromFiber, fromEffect)
export const fromFiberEffect = flow(Effect.fromFiberEffect, fromEffect)

export const fromOption = flow(Effect.fromOption, fromEffect)
