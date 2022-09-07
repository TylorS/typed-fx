import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Concat'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Effect } from './Effect.js'

export class EffectRef<Fx extends Effect.AnyIO, E, A> {
  constructor(
    readonly initial: Effect<Fx, E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (current: A, incoming: A) => A = Second.concat,
    readonly Eq: Eq<A> = DeepEquals,
  ) {}

  static make = make
}

export function make<R extends Effect.AnyIO, E, A>(
  initial: Effect<R, E, A>,
  params: Params<A> = {},
): EffectRef<R, E, A> {
  return new EffectRef(initial, params.fork, params.join, params.Eq)
}

export type Params<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}
