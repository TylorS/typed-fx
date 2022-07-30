import type { Instruction } from './Instruction.js'

import * as Eff from '@/Fx/Eff/index.js'
import type { Env } from '@/Fx/Env/Env.js'

export class Access<R, R2, E, A> extends Eff.Access<Env<R>, Instruction<R2, E, A>, A> {
  readonly tag = 'Access'
}
