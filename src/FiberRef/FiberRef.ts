import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Associative'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export class FiberRef<in out R extends Service<any>, E, A> {
  constructor(
    readonly initial: Fx<R, E, A>,
    readonly fork: (a: A) => Maybe<A>,
    readonly join: (current: A, incoming: A) => A,
    readonly Eq: Eq<A>,
  ) {}
}

export type AnyFiberRef = FiberRef<any, any, any>

export type FiberRefPaarms<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}

export const make = <R extends Service<any>, E, A>(
  initial: Fx<R, E, A>,
  params: FiberRefPaarms<A> = {},
) => {
  const { fork = Just, join = Second.concat, Eq = DeepEquals } = params

  return new FiberRef(initial, fork, join, Eq)
}
