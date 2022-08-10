import { Either, isRight } from 'hkt-ts/Either'
import { Lazy, pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

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
import { RaceAll } from './Instructions/RaceAll.js'
import { SetInterruptStatus } from './Instructions/SetInterruptStatus.js'
import { WithConcurrency } from './Instructions/WithConcurrency.js'
import { ZipAll } from './Instructions/ZipAll.js'

import { Cause } from '@/Cause/Cause.js'
import * as Eff from '@/Eff/index.js'
import type { Env } from '@/Env/Env.js'
import * as Exit from '@/Exit/Exit.js'
import type { Fiber, Live } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import type * as Layer from '@/Layer/Layer.js'
import type { Closeable } from '@/Scope/Closeable.js'
import * as Service from '@/Service/index.js'
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

/**
 * An Fx which has Resource requirements and outputs a value.
 */
export interface RIO<R, A> extends Fx<R, never, A> {}

/**
 * An Fx which may fail with E or output an A.
 */
export interface IO<E, A> extends Fx<never, E, A> {}

/**
 * An Fx which should only ever output an A.
 */
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

/**
 * Access the Fx Env to find services.
 */
export const access = <R, R2, E, A>(
  f: (r: Env<R>) => Fx<R2, E, A>,
  __trace?: string,
): Fx<R | R2, E, A> => new Access(f, __trace)

/**
 * Get the Current Fx Env
 */
export const getEnv = <R>(__trace?: string): Fx<R, never, Env<R>> => access(fromValue, __trace)

/**
 * Ask for a Service from the Env
 */
export const ask = <S extends Service.Service<any>>(
  service: S,
  __trace?: string,
): RIO<Service.OutputOf<S>, Service.OutputOf<S>> =>
  access((r: Env<Service.OutputOf<S>>) => r.get(service), __trace)

/**
 * Apply a function to a Service.
 */
export const asks =
  <S, A>(f: (s: S) => A, __trace?: string) =>
  (service: Service.Service<S>) =>
    access(
      (r: Env<S>) =>
        Fx(function* () {
          return f(yield* r.get(service))
        }),
      __trace,
    )

export const asksFx =
  <S, R, E, A>(f: (s: S) => Fx<R, E, A>, __trace?: string) =>
  (service: Service.Service<S>) =>
    access(
      (r: Env<S>) =>
        Fx(function* () {
          return yield* f(yield* r.get(service))
        }),
      __trace,
    )

export const asksFx_ =
  <S extends Service.Service<any>>(service: S) =>
  <R, E, A>(f: (s: Service.OutputOf<S>) => Fx<R, E, A>, __trace?: string) =>
    access(
      (r: Env<Service.OutputOf<S>>) =>
        Fx(function* () {
          return yield* f(yield* r.get(service))
        }),
      __trace,
    )

/**
 * Provide the entire Env for an Fx to run within.
 */
export const provide =
  <R>(env: Env<R>, __trace?: string) =>
  <E, A>(fx: Fx<R, E, A>): Fx<never, E, A> =>
    new Provide([fx, env], __trace)

/**
 * Provide a single service to the Env.
 */
export const provideService =
  <S, I extends S>(service: Service.Service<S>, impl: I, __trace?: string) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R, S>, E, A> =>
    access((env) => pipe(fx, provide((env as Env<R>).add(service, impl))), __trace)

/**
 * Use a Layer to provide a Service lazily and asynchronously.
 */
export const provideLayer =
  <R2, E2, S>(layer: Layer.Layer<R2, E2, S>, __trace?: string) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R | R2, S>, E | E2, A> =>
    access(
      (env) =>
        Fx(function* () {
          const provided = yield* (env as Env<R | R2>).addLayer(layer)

          return yield* pipe(fx, provide(provided))
        }),
      __trace,
    ) as Fx<Exclude<R | R2, S>, E | E2, A>

/**
 * Provide any number of Layers.
 */
export const provideLayers =
  <Layers extends ReadonlyArray<Layer.AnyLayer>>(layers: readonly [...Layers], __trace: string) =>
  <R, E, A>(
    fx: Fx<R | Layer.OutputOf<Layers[number]>, E, A>,
  ): Fx<Exclude<R, Layer.OutputOf<Layers[number]>>, E | Layer.ErrorsOf<Layers[number]>, A> =>
    access(
      (env) =>
        Fx(function* () {
          let provided: Env<any> = env

          for (const layer of layers) {
            provided = yield* provided.addLayer(layer)
          }

          return yield* pipe(fx, provide(provided))
        }),
      __trace,
    )

/**
 * Add a Trace to the Fx Stack for printing during failure.
 */
export const addTrace =
  (trace: Trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new AddTrace([fx, trace])

/**
 * Adds a custom trace to the Fx stack using a string. It
 * parses these strings as expected by the typescript plugin
 * to produce better stack traces.
 */
export const addCustomTrace =
  (trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    trace ? addTrace(Trace.custom(trace))(fx) : fx

/**
 * Adds a Trace using an Error or Error-like object to generate the stack.
 */
export const addRuntimeTrace =
  <E extends { readonly stack?: string }>(
    error: E = new Error() as any,
    // eslint-disable-next-line @typescript-eslint/ban-types
    targetObject?: Function,
  ) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    addTrace(Trace.runtime(error, targetObject))(fx)

/**
 * Access the Current Trace
 */
export const getTrace: Of<Trace> = new GetTrace()

/**
 * Run a potentially Asynchronous Fx operation.
 */
export const async = <R, E, A>(register: AsyncRegister<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new Async(register, __trace)

/**
 * Convert a Cause into an Fx
 */
export const fromCause = <E>(cause: Cause<E>, __trace?: string): IO<E, never> =>
  new Failure(cause, __trace)

/**
 * Convert an Exit into an Fx
 */
export const fromExit = <E = never, A = unknown>(
  exit: Exit.Exit<E, A>,
  __trace?: string,
): IO<E, A> =>
  exit.tag === 'Left' ? fromCause(exit.left, __trace) : fromValue(exit.right, __trace)

/**
 * Create an Expected Error
 */
export const fail = <E>(error: E, __trace?: string): IO<E, never> =>
  fromExit(Exit.failure(error), __trace)

/**
 * Interrupt the current fiber with an FiberId.
 */
export const interrupt = (id: FiberId, __trace?: string): Of<never> =>
  fromExit(Exit.interrupt(id), __trace)

/**
 * Report an unexpected failure.
 */
export const die = (error: unknown, __trace?: string): Of<never> =>
  fromExit(Exit.die(error), __trace)

/**
 * Convert an Either into an Fx
 */
export const fromEither = <E, A>(either: Either<E, A>, __trace?: string): IO<E, A> =>
  fromExit(Exit.fromEither(either), __trace)

/**
 * Lazily construct a value with an Fx.
 */
export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Of<A> => new FromLazy(f, __trace)

/**
 * Convert a value into an Fx
 */
export const fromValue = <A>(value: A, __trace?: string): Of<A> => fromLazy(() => value, __trace)

/**
 * Lazily reference an Fx
 */
export const lazy = <R, E, A>(f: () => Fx<R, E, A>, __trace?: string) =>
  Fx(function* () {
    return yield* yield* fromLazy(f, __trace)
  })

/**
 * Create a successful Fx
 */
export const success = fromValue

/**
 * An Fx with no value
 */
export const unit = success<void>(undefined, 'unit')

/**
 * Get the current FiberContext
 */
export const getFiberContext: Of<FiberContext> = new GetFiberContext(undefined, 'getFiberContext')

/**
 * Get the current FiberScope
 */
export const getFiberScope: Of<Closeable> = new GetFiberScope(undefined, 'getFiberScope')

/**
 * Add a Finalizer to the Fx stack.
 */
export const ensuring =
  <E, A, R2, E2>(finalizer: (exit: Exit.Exit<E, A>) => Fx<R2, E2, any>, __trace?: string) =>
  <R>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    new Ensuring<R | R2, E | E2, A>([fx, finalizer], __trace)

/**
 * Fork a Fiber with ForkParams.
 */
export const forkWithParams =
  (params: ForkParams, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>) =>
    new Fork([fx, params], __trace)

/**
 * Fork a Fiber with default parameters.
 */
export const fork = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Live<E, A>> =>
  Fx(function* () {
    return yield* forkWithParams(yield* forkFiberContext, __trace)(fx)
  })

export const forkFiberContext: Of<FiberContext> = Fx(function* () {
  return FiberContext.fork(yield* getFiberContext)
})

/**
 * Join a Fiber back with it's parent.
 */
export const join = <E, A>(fiber: Fiber<E, A>): IO<E, A> =>
  Fx(function* () {
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* inheritFiberRefs(fiber)
    }

    return yield* fromExit(exit)
  })

/**
 * Capture any failures locally.
 */
export const attempt = <R, E, A>(fx: Fx<R, E, A>): RIO<R, Exit.Exit<E, A>> =>
  Fx(function* () {
    const fiber: Live<E, A> = yield* fork(fx)
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* inheritFiberRefs(fiber)
    }

    return exit
  })

/**
 * Inherit the FiberRefs of another Fiber into the current.
 */
export function inheritFiberRefs<E, A>(fiber: Fiber<E, A>): Of<void> {
  return Fx(function* () {
    if (fiber.tag === 'Synthetic') {
      return yield* fiber.inheritFiberRefs
    }

    const context = yield* fiber.context

    yield* context.fiberRefs.inherit
  })
}

/**
 * Mark a region of the Fx stack as uninterruptable, disallowing the Fiber to be interrupted
 * until completion.
 */
export const uninterruptable = <R, E, A>(
  fx: Fx<R, E, A>,
  __trace?: string | undefined,
): Fx<R, E, A> => new SetInterruptStatus([fx, false], __trace)

/**
 * Mark a region of the Fx stack as interruptable. Be careful using this operator, it will interrupts
 * to flow back into uninterruptable regions.
 */
export const interruptable = <R, E, A>(
  fx: Fx<R, E, A>,
  __trace?: string | undefined,
): Fx<R, E, A> => new SetInterruptStatus([fx, true], __trace)

/**
 * Combine an Array of Fx into an Fx of an array containing their output values.
 */
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

/**
 * Race an array of Fx into an Fx of the first resolved Fx, cancelling all other
 * operations not resolved.
 */
export const raceAll = <FX extends ReadonlyArray<AnyFx>>(
  fxs: FX,
  __trace?: string,
): Fx<ResourcesOf<FX[number]>, ErrorsOf<FX[number]>, OutputOf<FX[number]>> =>
  new RaceAll(fxs, __trace)

/**
 * Control the concurrency level of any region of Fx.
 */
export const withConcurrency =
  (concurrencyLevel: NonNegativeInteger, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new WithConcurrency([fx, concurrencyLevel], __trace)

/**
 * Utilize a Generator function to construct an Fx.
 */
export function Fx<Y extends AnyInstruction, R>(
  f: () => Generator<Y, R, any>,
): Fx<ResourcesFromInstruction<Y>, ErrorsFromInstruction<Y>, R> {
  return Eff.Eff(f)
}
