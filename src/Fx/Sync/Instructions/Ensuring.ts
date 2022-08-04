import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class Ensuring<R, E, A> extends Eff.Ensuring<
  Instruction<R, E, any>,
  A,
  Instruction<R, E, any>
> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
