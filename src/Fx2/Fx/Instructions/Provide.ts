import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class Provide<R, E, A> extends Eff.Provide<Instruction<R, E, any>, A, R> {
  readonly __R?: () => never
  readonly __E?: () => E
  readonly __A?: () => A
}
