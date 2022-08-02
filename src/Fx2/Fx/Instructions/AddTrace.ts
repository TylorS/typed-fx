import * as Eff from '@/Eff/index.js'
import { Instruction } from './Instruction.js'

export class AddTrace<R, E, A> extends Eff.AddTrace<Instruction<R, E, any>, A> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
