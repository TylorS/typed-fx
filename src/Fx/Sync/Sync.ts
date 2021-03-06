/* eslint-disable @typescript-eslint/ban-types */
import { Lazy } from 'hkt-ts'

import { Env } from './Env.js'
import type {
  AnyInstruction,
  ErrorsFromInstruction,
  Instruction,
  ResourcesFromInstruction,
} from './Instruction.js'

import { Cause, died, failed } from '@/Fx/Cause/Cause.js'
import * as Eff from '@/Fx/Eff/index.js'
import { Exit } from '@/Fx/Exit/Exit.js'
import { Trace } from '@/Fx/Trace/index.js'
import { Service } from '@/Service/index.js'

export interface Sync<out R, out E, out A> extends Eff.Eff<Instruction<R, E, any>, A> {}

export type AnySync =
  | Sync<any, any, any>
  | Sync<unknown, never, any>
  | Sync<unknown, any, any>
  | Sync<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _R : never

export type ErrorsOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _E : never

export type OutputOf<T> = T extends Sync<infer _R, infer _E, infer _A> ? _A : never

/* eslint-enable @typescript-eslint/no-unused-vars */

export function Sync<Y extends AnyInstruction, R>(
  f: () => Generator<Y, R>,
): Sync<ResourcesFromInstruction<Y>, ErrorsFromInstruction<Y>, R> {
  return {
    [Symbol.iterator]: f,
  }
}

export const fromValue = Eff.fromValue as <A>(value: A) => Sync<never, never, A>
export const fromLazy = Eff.fromLazy as <A>(f: Lazy<A>) => Sync<never, never, A>

export const failure = Eff.failure as <E = never>(
  cause: Cause<E>,
  __trace?: string,
) => Sync<never, E, never>
export const die = (error: unknown, __trace?: string): Sync<never, never, never> =>
  failure(died(error), __trace)
export const fail = <E>(error: E, __trace?: string) => failure(failed(error), __trace)
export const attempt = Eff.attempt as <R, E, A>(sync: Sync<R, E, A>) => Sync<R, never, Exit<E, A>>

export const access = Eff.access as <R, R2, E, A>(
  f: (r: Env<R>) => Sync<R2, E, A>,
  __trace?: string,
) => Sync<R | R2, E, A>

export const getEnv = <R>(__trace?: string) => access((r: Env<R>) => fromValue(r), __trace)

export const ask = <R>(service: Service<R>, __trace?: string | undefined): Sync<R, never, R> =>
  access((r: Env<R>) => fromValue(r.get(service)), __trace)

export const asks = <R, A>(
  service: Service<R>,
  f: (r: R) => A,
  __trace?: string | undefined,
): Sync<R, never, A> => access((r: Env<R>) => fromLazy(() => f(r.get(service))), __trace)

export const provide = Eff.provide as <R>(
  resources: Env<R>,
) => <E, A>(sync: Sync<R, E, A>) => Sync<never, E, A>

export const getTrace = Eff.getTrace as Sync<never, never, Trace>
export const addTrace = Eff.addTrace as (trace: Trace) => Sync<never, never, void>
export const addCustomTrace = Eff.addCustomTrace as (trace?: string) => Sync<never, never, void>
export const addRuntimeTrace = Eff.addRuntimeTrace as <
  E extends {
    readonly stack?: string
  },
>(
  error: E,
  targetObject?: Function,
) => Sync<never, never, void>
