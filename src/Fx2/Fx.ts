import { Lazy, flow, identity, pipe } from 'hkt-ts'
import * as Either from 'hkt-ts/Either'
import { Unary } from 'hkt-ts/Unary'

import {
  Access,
  AddTrace,
  AnyInstruction,
  Ensuring,
  FlatMap,
  FromCause,
  FromLazy,
  GetTrace,
  Instruction,
  LazyFx,
  MapFx,
  Match,
  Now,
  Provide,
} from './Instruction.js'

import { getCauseError } from '@/Cause/CauseError.js'
import * as Cause from '@/Cause/index.js'
import { ReturnOf, YieldOf } from '@/Eff/Eff.js'
import { Env } from '@/Env/Env.js'
import { Exit } from '@/Exit/index.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import { Service } from '@/Service/Service.js'
import { Trace } from '@/Trace/Trace.js'

export interface Fx<R, E, A> {
  readonly instr: Instruction<R, E, A>
  readonly [Symbol.iterator]: () => Generator<Instruction<R, E, any>, A, any>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = [T] extends [never]
  ? never
  : [T] extends [Fx<infer R, infer _, infer __>]
  ? R
  : never

export type ErrorsOf<T> = [T] extends [never]
  ? never
  : [T] extends [Fx<infer _, infer E, infer __>]
  ? E
  : never

export type OutputOf<T> = [T] extends [never]
  ? never
  : [T] extends [Fx<infer _, infer __, infer A>]
  ? A
  : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface IO<E, A> extends Fx<never, E, A> {}
export interface Of<A> extends IO<never, A> {}

export interface RIO<R, A> extends Fx<R, never, A> {}

export type AnyFx =
  | Fx<any, any, any>
  | Fx<never, never, any>
  | Fx<never, any, any>
  | Fx<any, never, any>

export const now = <A>(a: A, __trace?: string): Of<A> => Now.make(a, __trace)

export const unit = now<void>(undefined)

export const fromLazy = <A>(a: Lazy<A>, __trace?: string): Of<A> => FromLazy.make(a, __trace)

export const lazy = <T extends AnyFx>(a: Lazy<T>, __trace?: string): T =>
  LazyFx.make(a as any, __trace) as T

export const flatMap =
  <A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>, __trace?: string) =>
  <R, E>(fx: Fx<R, E, A>) =>
    FlatMap.make(fx, f, __trace)

export const access = <R = never, R2 = never, E = never, A = any>(
  f: (r: Env<R>) => Fx<R2, E, A>,
  __trace?: string,
): Fx<R | R2, E, A> => Access.make(f, __trace)

export const provide =
  <R>(env: Env<R>, __trace?: string) =>
  <E, A>(fx: Fx<R, E, A>): IO<E, A> =>
    new Provide(fx, env, __trace) as IO<E, A>

export const provideService =
  <S, I extends S>(s: Service<S>, impl: I) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R, S>, E, A> =>
    access((env) => pipe(fx, provide((env as Env<R>).add(s, impl))))

export const ask = <S>(s: Service<S>, __trace?: string): RIO<S, S> =>
  access((e) => now(e.get(s)), __trace)

export const ensuring =
  <E, A, R2, E2, B>(ensure: (a: Exit<E, A>) => Fx<R2, E2, B>, __trace?: string) =>
  <R>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    Ensuring.make(fx, ensure, __trace)

export const fromCause = <E>(cause: Cause.Cause<E>, __trace?: string): IO<E, never> =>
  FromCause.make(cause, __trace)

export const fromExit = <E, A>(exit: Exit<E, A>, __trace?: string): IO<E, A> =>
  exit.tag === 'Left' ? (fromCause(exit.left, __trace) as any) : now(exit.right, __trace)

export const map =
  <A, B>(f: Unary<A, B>, __trace?: string) =>
  <R, E>(fx: Fx<R, E, A>): Fx<R, E, B> =>
    MapFx.make(fx, f, __trace)

export const match =
  <E, R2, E2, B, A, R3, E3, C>(
    onLeft: (cause: Cause.Cause<E>) => Fx<R2, E2, B>,
    onRight: (a: A) => Fx<R3, E3, C>,
    __trace?: string,
  ) =>
  <R>(fx: Fx<R, E, A>): Fx<R | R2 | R3, E2 | E3, B | C> =>
    Match.make(fx, onLeft, onRight, __trace)

export const orElseCause =
  <E, R2, E2, B>(onLeft: (cause: Cause.Cause<E>) => Fx<R2, E2, B>, __trace?: string) =>
  <R, A>(fx: Fx<R, E, A>): Fx<R | R2, E2, A | B> =>
    Match.make(fx, onLeft, now, __trace)

export const orElse =
  <E, R2, E2, B>(onLeft: (cause: E) => Fx<R2, E2, B>, __trace?: string) =>
  <R, A>(fx: Fx<R, E, A>): Fx<R | R2, E2, A | B> =>
    Match.make(
      fx,
      (cause) =>
        cause.tag === 'Expected' ? onLeft(cause.error) : (fromCause(cause) as Fx<R2, E2, B>),
      now,
      __trace,
    )

export const mapLeft = <E, E2>(f: (e: E) => E2) => orElseCause(flow(Cause.map(f), fromCause))

export const attempt = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, never, Exit<E, A>> =>
  pipe(fx, match(flow(Either.Left, now), flow(Either.Right, now), __trace))

export const addTrace =
  (trace: Trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    new AddTrace(fx, trace)

export const addCustomTrace =
  (trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    trace ? addTrace(Trace.custom(trace))(fx) : fx

export const getTrace: Of<Trace> = GetTrace.make()

export function Fx<G extends Generator<AnyInstruction, any>>(
  f: () => G,
  __trace?: string,
): Fx<ResourcesOf<YieldOf<G>>, ErrorsOf<YieldOf<G>>, ReturnOf<G>> {
  return lazy(() => {
    const gen = f()

    return pipe(
      runFxGenerator(gen, gen.next()),
      // Allow running Gen.throw to attempt to use try/catch to handle any errors
      orElseCause(
        (cause) =>
          (Cause.shouldRethrow(cause)
            ? lazy(() => runFxGenerator(gen, gen.throw(getCauseError(cause)))) // TODO: How to handle keeping the full Cause all the way up?
            : fromCause(cause)) as Fx<ResourcesOf<YieldOf<G>>, ErrorsOf<YieldOf<G>>, ReturnOf<G>>,
      ),
    )
  }, __trace)
}

function runFxGenerator<G extends Generator<AnyInstruction, any>>(
  gen: G,
  result: IteratorResult<AnyInstruction, any>,
): Fx<ResourcesOf<YieldOf<G>>, ErrorsOf<YieldOf<G>>, ReturnOf<G>> {
  if (result.done) {
    return now(result.value) as Fx<ResourcesOf<YieldOf<G>>, ErrorsOf<YieldOf<G>>, ReturnOf<G>>
  }

  return pipe(
    result.value as Fx<ResourcesOf<YieldOf<G>>, ErrorsOf<YieldOf<G>>, any>,
    flatMap((a) => runFxGenerator(gen, gen.next(a) as typeof result)),
  )
}

export function async<R, E, A, R2 = never, E2 = never>(
  register: AsyncRegister<R, E, A, R2, E2>,
  __trace?: string,
): Fx<R | R2, E | E2, A> {
  return addCustomTrace(__trace)(
    lazy(() => {
      const future = Pending<R, E, A>()
      const either = register(complete(future))

      return pipe(
        either,
        Either.match(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (finalizer) => ensuring((_: Exit<E, A>) => finalizer)(wait(future)),
          identity,
        ),
      ) as Fx<R | R2, E | E2, A>
    }),
  )
}

export interface AsyncRegister<R, E, A, R2, E2> {
  (cb: (fx: Fx<R, E, A>) => void): Either.Either<Fx<R2, E2, any>, Fx<R, E, A>>
}
