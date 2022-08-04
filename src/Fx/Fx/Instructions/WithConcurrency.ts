import { NonNegativeInteger } from 'hkt-ts/number'

import type { Fx } from '../Fx.js'

import { Eff } from '@/Eff/Eff.js'

export class WithConcurrency<R, E, A> extends Eff.Instruction<
  readonly [fx: Fx<R, E, A>, concurrencyLevel: NonNegativeInteger],
  A
> {
  readonly tag = 'WithConcurrency'

  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
