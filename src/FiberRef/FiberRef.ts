import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Concat'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Env } from '@/Env/Env.js'
import { Fx, now } from '@/Fx/Fx.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export class FiberRef<R, E, A> {
  constructor(
    readonly initial: Fx<R, E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (current: A, incoming: A) => A = Second.concat,
    readonly Eq: Eq<A> = DeepEquals,
  ) {}

  static make = make
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export type AnyFiberRef =
  | FiberRef<any, any, any>
  | FiberRef<never, never, any>
  | FiberRef<never, any, any>
  | FiberRef<any, never, any>

export function make<R, E, A>(initial: Fx<R, E, A>, params: Params<A> = {}): FiberRef<R, E, A> {
  return new FiberRef(initial, params.fork, params.join, params.Eq)
}

export type Params<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}

export const CurrentEnv = make(now(Env.empty as Env<unknown>))

export const CurrentInterruptStatus = make(now<boolean>(true))

export const CurrentConcurrencyLevel = make(now<NonNegativeInteger>(NonNegativeInteger(Infinity)))

export const CurrentTrace = make(now<Trace>(EmptyTrace))
