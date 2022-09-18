import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Concat'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { type Fx } from '@/Fx/Fx.js'

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

export type AnyFiberRef = FiberRef<any, any, any>

export function make<R, E, A>(initial: Fx<R, E, A>, params: Params<A> = {}): FiberRef<R, E, A> {
  return new FiberRef(initial, params.fork, params.join, params.Eq)
}

export type Params<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}
