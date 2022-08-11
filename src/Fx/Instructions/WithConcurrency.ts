import { NonNegativeInteger } from 'hkt-ts/number'

import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

export class WithConcurrency<R, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, concurrencyLevel: NonNegativeInteger],
  R,
  E,
  A
> {
  static tag = 'WithConcurrency' as const
  readonly tag = WithConcurrency.tag
}
