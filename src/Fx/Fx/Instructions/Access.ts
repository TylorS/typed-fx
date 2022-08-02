import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'
import type { Env } from '@/Fx2/Env/Env.js'

export class Access<R, R2, E, A> extends Eff.Access<Env<R>, Instruction<R2, E, any>, A> {
  readonly __R?: () => R | R2
  readonly __E?: () => E
  readonly __A?: () => A
}
