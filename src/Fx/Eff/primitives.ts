import { Lazy } from 'hkt-ts'

import { Eff } from './Eff.js'
import { FromLazy, fromLazy } from './FromLazy.js'

export function fromValue<A>(value: A, __trace?: string): Eff<FromLazy<A>, A> {
  return fromLazy(() => value, __trace)
}

export function lazy<Y, A>(f: Lazy<Eff<Y, A>>, __trace?: string): Eff<Y | FromLazy<Eff<Y, A>>, A> {
  return Eff(function* () {
    return yield* yield* fromLazy(f, __trace)
  })
}
