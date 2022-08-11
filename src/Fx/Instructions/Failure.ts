import { FxInstruction } from './FxInstruction.js'

import { Cause } from '@/Cause/Cause.js'

export class Failure<E> extends FxInstruction<Cause<E>, never, E, never> {
  static tag = 'Failure' as const
  readonly tag = Failure.tag
}
