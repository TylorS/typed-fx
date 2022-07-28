import { Lazy, pipe } from 'hkt-ts'

import { Eff } from './Eff.js'
import { handle } from './handle.js'

export class FromLazy<A> extends Eff.Instruction<Lazy<A>, A> {}

export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Eff<FromLazy<A>, A> =>
  new FromLazy(f, __trace)

export const handleFromLazy = <Y, R>(eff: Eff<Y, R>): Eff<Exclude<Y, FromLazy<any>>, R> =>
  pipe(
    eff,
    handle(
      (y) =>
        Eff(function* () {
          if (y instanceof FromLazy<any>) {
            return y.input()
          }

          return yield y as Exclude<Y, FromLazy<any>>
        }),
      (r) =>
        // eslint-disable-next-line require-yield
        Eff(function* () {
          return r
        }),
    ),
  )
