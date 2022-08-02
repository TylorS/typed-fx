import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class WithConcurrency<R, E, A> extends Eff.WithConcurrency<Instruction<R, E, any>, A> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}
