import { Lazy } from 'hkt-ts'

import { Eff } from './Eff.js'

export class FromLazy<A> extends Eff.Instruction<Lazy<A>, A> {
  readonly tag = 'FromLazy'
}

export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Eff<FromLazy<A>, A> =>
  new FromLazy(f, __trace)

export function fromValue<A>(value: A, __trace?: string): Eff<FromLazy<A>, A> {
  return fromLazy(() => value, __trace)
}

export function lazy<Y, A>(f: Lazy<Eff<Y, A>>, __trace?: string): Eff<Y | FromLazy<Eff<Y, A>>, A> {
  return Eff(function* () {
    return yield* yield* fromLazy(f, __trace)
  })
}
