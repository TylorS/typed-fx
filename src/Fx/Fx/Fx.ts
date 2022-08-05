import { Either, isRight } from 'hkt-ts/Either'
import { Lazy, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import type { Env } from '../Env/Env.js'
import type { Fiber, Live } from '../Fiber/Fiber.js'
import type { FiberContext } from '../FiberContext/index.js'
import type { Closeable } from '../Scope/Closeable.js'

import { Access, Provide } from './Instructions/Access.js'
import { AddTrace } from './Instructions/AddTrace.js'
import { Async, AsyncRegister } from './Instructions/Async.js'
import { Ensuring } from './Instructions/Ensuring.js'
import { Failure } from './Instructions/Failure.js'
import { Fork, ForkParams } from './Instructions/Fork.js'
import { FromLazy } from './Instructions/FromLazy.js'
import { GetFiberContext } from './Instructions/GetFiberContext.js'
import { GetFiberScope } from './Instructions/GetFiberScope.js'
import { GetTrace } from './Instructions/GetTrace.js'
import type {
  AnyInstruction,
  ErrorsFromInstruction,
  Instruction,
  ResourcesFromInstruction,
} from './Instructions/Instruction.js'
import { WithConcurrency } from './Instructions/WithConcurrency.js'
import { ZipAll } from './Instructions/ZipAll.js'

import { Cause } from '@/Cause/Cause.js'
import * as Eff from '@/Eff/index.js'
import * as Exit from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Service } from '@/Service/index.js'
import { Trace } from '@/Trace/Trace.js'

/**
 * Fx is the immutable representation of an Effectful program. It utilizes Generators to
 * encode type-safe dependency injection of `R`, type-safe errors `E`, and an Output of `A`.
 *
 * Features:
 *  - Asynchrony, write Async code using synchronous Generators.
 *  - Failures, respond to expected and unexpected failures.
 *  - Dependency Injection, Access the Environment to retrieve Services.
 *  - Interruption
 *      - Mark regions of Fx as "uninterruptable" to safely acquire resources.
 *      - Interrupt an Fx, waiting until it can do so, immediately if possible.
 *  - Tracing, Add custom traces or use our plugins to improve your stack traces.
 *  - Concurrency, control the concurrency level at at region of Fx
 *  - Fibers, fork fibers to enhance the way you manage Fx.
 */
export interface Fx<out R, out E, out A> extends Eff.Eff<Instruction<R, E, any>, A> {}

export interface RIO<R, A> extends Fx<R, never, A> {}
export interface IO<E, A> extends Fx<never, E, A> {}
export interface Of<A> extends Fx<never, never, A> {}

export type AnyFx =
  | Fx<any, any, any>
  | Fx<never, never, any>
  | Fx<never, any, any>
  | Fx<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _R : never

export type ErrorsOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _E : never

export type OutputOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _A : never

/* eslint-enable @typescript-eslint/no-unused-vars */

export const access = <R, R2, E, A>(
  f: (r: Env<R>) => Fx<R2, E, A>,
  __trace?: string,
): Fx<R | R2, E, A> => new Access(f, __trace)

export const getEnv = <R>(__trace?: string): Fx<R, never, Env<R>> => access(fromValue, __trace)

export const ask = <A>(service: Service<A>, __trace?: string) =>
  access((r: Env<A>) => r.get(service), __trace)

export const asks =
  <S, A>(f: (s: S) => A, __trace?: string) =>
  (service: Service<S>) =>
    access(
      (r: Env<S>) =>
        Fx(function* () {
          return f(yield* r.get(service))
        }),
      __trace,
    )

export const provide =
  <R>(env: Env<R>, __trace?: string) =>
  <E, A>(fx: Fx<R, E, A>): Fx<never, E, A> =>
    new Provide([fx, env], __trace)

export const provideService =
  <S, I extends S>(service: Service<S>, impl: I, __trace?: string) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R, S>, E, A> =>
    access((env) => pipe(fx, provide((env as Env<R>).add(service, impl))), __trace)

export const provideLayer =
  <S, I extends S>(service: Service<S>, impl: I, __trace?: string) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R, S>, E, A> =>
    access((env) => pipe(fx, provide((env as Env<R>).add(service, impl))), __trace)

export const addTrace =
  (trace: Trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new AddTrace([fx, trace])

export const addCustomTrace =
  (trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    trace ? addTrace(Trace.custom(trace))(fx) : fx

export const addRuntimeTrace =
  <E extends { readonly stack?: string }>(
    error: E = new Error() as any,
    // eslint-disable-next-line @typescript-eslint/ban-types
    targetObject?: Function,
  ) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    addTrace(Trace.runtime(error, targetObject))(fx)

export const getTrace: Of<Trace> = new GetTrace()

export const async = <R, E, A>(register: AsyncRegister<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new Async(register, __trace)

export const fromCause = <E>(cause: Cause<E>, __trace?: string): IO<E, never> =>
  new Failure(cause, __trace)

export const fromExit = <E = never, A = unknown>(
  exit: Exit.Exit<E, A>,
  __trace?: string,
): IO<E, A> =>
  exit.tag === 'Left' ? fromCause(exit.left, __trace) : fromValue(exit.right, __trace)

export const fail = <E>(error: E, __trace?: string): IO<E, never> =>
  fromExit(Exit.failure(error), __trace)

export const interrupt = (id: FiberId, __trace?: string): Of<never> =>
  fromExit(Exit.interrupt(id), __trace)

export const die = (error: unknown, __trace?: string): Of<never> =>
  fromExit(Exit.die(error), __trace)

export const fromEither = <E, A>(either: Either<E, A>, __trace?: string) =>
  fromExit(Exit.fromEither(either), __trace)

export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Of<A> => new FromLazy(f, __trace)

export const fromValue = <A>(value: A, __trace?: string): Of<A> => fromLazy(() => value, __trace)

export const lazy = <R, E, A>(f: () => Fx<R, E, A>, __trace?: string) =>
  Fx(function* () {
    return yield* yield* fromLazy(f, __trace)
  })

export const success = fromValue
export const unit = success<void>(undefined, 'unit')

export const getFiberContext: Of<FiberContext> = new GetFiberContext(undefined, 'getFiberContext')
export const getFiberScope: Of<Closeable> = new GetFiberScope(undefined, 'getFiberScope')

export const ensuring =
  <E, A, R2, E2>(finalizer: (exit: Exit.Exit<E, A>) => Fx<R2, E2, any>, __trace?: string) =>
  <R>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    new Ensuring<R | R2, E | E2, A>([fx, finalizer], __trace)

export const forkWithParams =
  (params: ForkParams = {}, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>) =>
    new Fork([fx, params], __trace)

export const fork = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Live<E, A>> =>
  forkWithParams({}, __trace)(fx)

export const join = <E, A>(fiber: Fiber<E, A>): IO<E, A> =>
  Fx(function* () {
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* inheritFiberRefs(fiber)
    }

    return yield* fromExit(exit)
  })

export const attempt = <R, E, A>(fx: Fx<R, E, A>): RIO<R, Exit.Exit<E, A>> =>
  Fx(function* () {
    const fiber: Live<E, A> = yield* fork(fx)
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* inheritFiberRefs(fiber)
    }

    return exit
  })

export function inheritFiberRefs<E, A>(fiber: Fiber<E, A>): Of<void> {
  return Fx(function* () {
    if (fiber.tag === 'Synthetic') {
      return yield* fiber.inheritFiberRefs
    }

    const context = yield* fiber.context

    yield* context.fiberRefs.inherit
  })
}

export const uninterruptable = Eff.uninterruptable as <R, E, A>(
  fx: Fx<R, E, A>,
  __trace?: string | undefined,
) => Fx<R, E, A>

export const interruptable = Eff.interruptable as <R, E, A>(
  fx: Fx<R, E, A>,
  __trace?: string | undefined,
) => Fx<R, E, A>

export const getInterruptStatus = Eff.getInterruptStatus as Of<boolean>

export const zipAll = <FX extends ReadonlyArray<AnyFx>>(
  fxs: FX,
  __trace?: string,
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> => new ZipAll(fxs, __trace)

export const withConcurrency =
  (concurrencyLevel: NonNegativeInteger, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new WithConcurrency([fx, concurrencyLevel], __trace)

export function Fx<Y extends AnyInstruction, R>(
  f: () => Generator<Y, R>,
): Fx<ResourcesFromInstruction<Y>, ErrorsFromInstruction<Y>, R> {
  return Eff.Eff(f)
}
