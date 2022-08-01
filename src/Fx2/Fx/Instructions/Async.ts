import type { Instruction } from './Instruction.js'

import * as Eff from '@/Eff/index.js'

export class Async<R, E, A> extends Eff.Async<
  Instruction<R, E, A>,
  A,
  Instruction<R, never, unknown>
> {
  readonly __R?: () => R
  readonly __E?: () => E
  readonly __A?: () => A
}

export interface AsyncRegister<R, E, A>
  extends Eff.AsyncRegister<Instruction<R, E, A>, A, Instruction<R, never, unknown>> {}
