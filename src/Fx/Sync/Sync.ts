/* eslint-disable @typescript-eslint/ban-types */
import { Lazy } from 'hkt-ts'
import { U } from 'ts-toolbelt'

import { Trace } from '../Trace/Trace'

import type {
  AnyInstruction,
  ErrorsFromInstruction,
  Instruction,
  ResourcesFromInstruction,
} from './Instruction'

import * as Cause from '@/Fx/Cause/Cause'
import * as Eff from '@/Fx/Eff/index'
import { Exit } from '@/Fx/Exit/Exit'

export interface Sync<in out R, out E, out A> {
  readonly [Symbol.iterator]: () => Generator<Instruction<R, E, any>, A>
}

export type AnySync =
  | Sync<any, any, any>
  | Sync<unknown, never, any>
  | Sync<unknown, any, any>
  | Sync<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _R : never

export type ErrorsOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _E : never

export type OutputOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _A : never

export type ResourcesFromGenerator<T> = T extends Generator<infer Y, infer _R, infer _N>
  ? ResourcesFromInstruction<Y>
  : never

export type ErrorsFromGenerator<T> = T extends Generator<infer Y, infer _R, infer _N>
  ? ErrorsFromInstruction<Y>
  : never

export type OutputFromGenerator<T> = T extends Generator<AnyInstruction, infer A> ? A : never

/* eslint-enable @typescript-eslint/no-unused-vars */

export function Sync<G extends Generator<AnyInstruction, any>>(
  f: () => G,
): Sync<ResourcesFromGenerator<G>, ErrorsFromGenerator<G>, OutputFromGenerator<G>> {
  return {
    [Symbol.iterator]: f,
  }
}

export const fromValue = Eff.fromValue as <A>(value: A) => Sync<never, never, A>
export const fromLazy = Eff.fromLazy as <A>(f: Lazy<A>) => Sync<never, never, A>

export const failure = Eff.failure as <E = never>(
  cause: Cause.Cause<E>,
  __trace?: string,
) => Sync<never, E, never>
export const die = (error: unknown, __trace?: string): Sync<never, never, never> =>
  failure(Cause.died(error), __trace)
export const fail = <E>(error: E, __trace?: string) => failure(Cause.failed(error), __trace)
export const attempt = Eff.attempt as <R, E, A>(sync: Sync<R, E, A>) => Sync<R, never, Exit<E, A>>

export const access = Eff.access as <R, R2, E, A>(
  f: (r: R) => Sync<R2, E, A>,
  __trace?: string,
) => Sync<R | R2, E, A>
export const ask = <R>(__trace?: string | undefined): Sync<R, never, U.IntersectOf<R>> =>
  access((r: R) => fromValue(r as U.IntersectOf<R>), __trace)
export const asks = <R, A>(f: (r: R) => A, __trace?: string | undefined): Sync<R, never, A> =>
  access((r: R) => fromLazy(() => f(r)), __trace)
export const provide = Eff.provide as <R>(
  resources: R,
) => <E, A>(sync: Sync<R, E, A>) => Sync<never, E, A>

export const getTrace = Eff.getTrace as Sync<never, never, Trace>
export const addTrace = Eff.addTrace as (trace: Trace) => Sync<never, never, void>
