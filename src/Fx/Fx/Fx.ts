/* eslint-disable @typescript-eslint/no-unused-vars */

import * as Cause from '../Cause/Cause.js'
import type { Env } from '../Env/Env.js'
import { Exit } from '../Exit/Exit.js'
import { FiberId } from '../FiberId/FiberId.js'
import { Trace } from '../Trace/Trace.js'

import type * as Instruction from './Instruction/Instruction.js'

import * as Eff from '@/Fx/Eff/index.js'
import { addTrace } from '@/Fx/Eff/index.js'
import * as S from '@/Service/index.js'

export interface Fx<out R, out E, out A> extends Eff.Eff<Instruction.Instruction<R, E, any>, A> {}

export type AnyFx =
  | Fx<any, any, any>
  | Fx<never, never, any>
  | Fx<never, any, any>
  | Fx<any, never, any>

export type AnyInstruction = Eff.YieldOf<AnyFx>

export interface Of<A> extends Fx<never, never, A> {}
export interface IO<E, A> extends Fx<never, E, A> {}
export interface RIO<R, A> extends Fx<R, never, A> {}

export type ResourcesOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends Fx<infer _R, infer _E, infer _A> ? _A : never

export function Fx<G extends Generator<AnyInstruction, any>>(
  f: () => G,
  __trace?: string,
): Fx<
  Instruction.ResourcesFromInstruction<Eff.YieldOf<G>>,
  Instruction.ErrorsFromInstruction<Eff.YieldOf<G>>,
  Eff.ReturnOf<G>
> {
  return Eff.Eff(function* () {
    // Allow creating custom traces for each Fx
    if (__trace) {
      yield* addTrace(Trace.custom(__trace))
    }

    return yield* f()
  })
}

export const lazy = <R, E, A>(f: () => Fx<R, E, A>, __trace?: string): Fx<R, E, A> =>
  Eff.lazy(f, __trace)
export const fromLazy = <A>(f: () => A, __trace?: string): Of<A> => Eff.fromLazy(f, __trace)
export const fromValue = <A>(value: A, __trace?: string): Of<A> => Eff.fromValue(value, __trace)
export const unit = fromValue<void>(undefined)

export const access = <R, R2, E, A>(
  f: (env: Env<R>) => Fx<R2, E, A>,
  __trace?: string,
): Fx<R | R2, E, A> => Eff.access(f, __trace) as Fx<R | R2, E, A>

export const getEnv = <R>(__trace?: string): Fx<R, never, Env<R>> =>
  access((env: Env<R>) => fromValue(env), __trace)

export const ask = <S extends S.Key<any>>(
  service: S,
  __trace?: string,
): Fx<S.ResourcesOf<S>, never, S.OutputOf<S>> =>
  access<any, never, never, S.OutputOf<S>>((env) => env.get(service), __trace)

export const askMany = <S extends ReadonlyArray<S.Key<any>>>(
  keys: readonly [...S],
  __trace?: string,
): Fx<S.ResourcesOf<S[number]>, never, { readonly [K in keyof S]: S.OutputOf<S[K]> }> =>
  access<any, any, never, any>((env) => env.get(S.tuple(...keys)), __trace)

export const provide =
  <R>(env: Env<R>) =>
  <E, A>(fx: Fx<R, E, A>): Fx<never, E, A> =>
    Eff.provide(env)(fx) as Fx<never, E, A>

export const attempt = <R, E, A>(fx: Fx<R, E, A>): Fx<R, never, Exit<E, A>> => Eff.attempt(fx)

export const failure = <E = never>(cause: Cause.Cause<E>, __trace?: string): Fx<never, E, never> =>
  Eff.failure(cause, __trace)

export const died = (error: unknown, __trace?: string) => failure(Cause.died(error), __trace)
export const failed = <E>(error: E, __trace?: string) => failure(Cause.failed(error), __trace)
export const interrupted = (id: FiberId, __trace?: string) =>
  failure(Cause.interrupted(id), __trace)
