import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Concat'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { type Fx } from '@/Fx/Fx.js'
import { Tagged } from '@/Tagged/index.js'

export class FiberRef<R, E, A> {
  constructor(
    readonly id: FiberRefId,
    readonly initial: Fx<R, E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (current: A, incoming: A) => A = Second.concat,
    readonly Eq: Eq<A> = DeepEquals,
  ) {}

  static make = make
}

export type FiberRefId = Tagged<'FiberRefId', symbol>
export const FiberRefId = Tagged<FiberRefId>()

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export type AnyFiberRef = FiberRef<any, any, any>

export function make<R, E, A>(initial: Fx<R, E, A>, params: Params<A> = {}): FiberRef<R, E, A> {
  return new FiberRef(
    params.id ?? FiberRefId(Symbol(params.name ?? '')),
    initial,
    params.fork,
    params.join,
    params.Eq,
  )
}

export type Params<A> = {
  readonly id?: FiberRefId
  readonly name?: string
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}
