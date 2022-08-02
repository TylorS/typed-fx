import { NonNegativeInteger } from 'hkt-ts/number'

import { Eff } from '../Eff.js'

export class WithConcurrency<Y, R> extends Eff.Instruction<
  readonly [eff: Eff<Y, R>, concurrencyLevel: NonNegativeInteger],
  R
> {
  readonly tag = 'WithConcurrency'
}

export const withConcurrency =
  (concurrencyLevel: NonNegativeInteger, __trace?: string) =>
  <Y, R>(eff: Eff<Y, R>) =>
    new WithConcurrency([eff, concurrencyLevel], __trace)
