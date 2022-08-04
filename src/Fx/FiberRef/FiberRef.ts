import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Associative'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Fx } from '@/Fx/Fx/Fx.js'

export class FiberRef<R, E, A> {
  constructor(
    readonly initial: Fx<R, E, A>,
    readonly fork: (a: A) => Maybe<A>,
    readonly join: (current: A, incoming: A) => A,
    readonly Eq: Eq<A>,
  ) {}
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

export type Params<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}

export const make = <R, E, A>(initial: Fx<R, E, A>, params: Params<A> = {}) => {
  const { fork = Just, join = Second.concat, Eq = DeepEquals } = params

  return new FiberRef(initial, fork, join, Eq)
}
