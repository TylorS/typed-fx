import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import { Trace } from '@/Trace/Trace.js'

export class AddTrace<R, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, trace: Trace],
  R,
  E,
  A
> {
  readonly tag = ''
}
