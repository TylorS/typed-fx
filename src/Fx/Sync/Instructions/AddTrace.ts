import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class AddTrace<R, E, A> extends Eff.AddTrace<Instruction<R, E, any>, A> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
