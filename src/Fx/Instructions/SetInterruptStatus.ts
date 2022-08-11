import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

export class SetInterruptStatus<R, E, A> extends FxInstruction<
  readonly [Fx<R, E, A>, boolean],
  R,
  E,
  A
> {
  static tag = 'SetInterruptStatus' as const
  readonly tag = SetInterruptStatus.tag
}
