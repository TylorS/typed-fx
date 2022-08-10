import { FxInstruction } from './FxInstruction.js'

import { Cause } from '@/Cause/Cause.js'

export class Failure<E> extends FxInstruction<Cause<E>, never, E, never> {
  readonly tag = 'Failure'
}
