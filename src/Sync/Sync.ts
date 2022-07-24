import { Lazy, flow } from 'hkt-ts'

import type { ErrorsFromInstruction, Instruction, ResourcesFromInstruction } from './Instruction'

import * as Cause from '@/Cause/Cause'
import * as Eff from '@/Eff/index'
import { Exit } from '@/Exit/Exit'

export interface Sync<R, E, A> {
  readonly [Symbol.iterator]: () => Generator<Instruction<R, E, any>, A>
}

export type AnySync =
  | Sync<any, any, any>
  | Sync<never, never, any>
  | Sync<never, any, any>
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

type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

export function Sync<G extends Generator<any, any>>(
  f: () => G,
): Sync<ResourcesFromGenerator<G>, ErrorsFromGenerator<G>, OutputFromGenerator<G>> {
  return {
    [Symbol.iterator]: f,
  } as Sync<ResourcesFromGenerator<G>, ErrorsFromGenerator<G>, OutputFromGenerator<G>>
}

export const fromValue = Eff.fromValue as <A>(value: A) => Sync<never, never, A>
export const fromLazy = Eff.fromLazy as <A>(f: Lazy<A>) => Sync<never, never, A>

export const failure = Eff.failure as <E = never>(cause: Cause.Cause<E>) => Sync<never, E, never>
export const die = flow(Cause.died, failure) as (error: unknown) => Sync<never, never, never>
export const fail = flow(Cause.failed, failure)
export const attempt = Eff.attempt as <R, E, A>(sync: Sync<R, E, A>) => Sync<R, never, Exit<E, A>>

export const access = Eff.access as <R, R2, E, A>(f: (r: R) => Sync<R2, E, A>) => Sync<R | R2, E, A>
export const ask = <R>(): Sync<R, never, R> => access(fromValue)
export const asks = <R, A>(f: (r: R) => A) => access((r: R) => fromLazy(() => f(r)))
export const provide = Eff.provide as <R>(
  resources: R,
) => <E, A>(sync: Sync<R, E, A>) => Sync<never, E, A>
