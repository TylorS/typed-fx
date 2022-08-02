import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class SetInterruptStatus<R, E, A> extends Eff.SetInterruptStatus<Instruction<R, E, any>, A> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
