import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import type { Finalizer } from '@/Finalizer/Finalizer.js'

export class Ensuring<R, E, A> extends FxInstruction<
  readonly [fx: Fx<R, E, A>, finalizer: Finalizer<R, E>],
  R,
  E,
  A
> {
  readonly tag = 'Ensuring'
}
