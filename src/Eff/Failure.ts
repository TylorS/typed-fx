import { Eff } from './Eff.js'

import * as Cause from '@/Cause/Cause.js'

export class Failure<E> extends Eff.Instruction<Cause.Cause<E>, never> {
  readonly tag = 'Failure'
}

export function failure<E>(cause: Cause.Cause<E>, __trace?: string): Eff<Failure<E>, never> {
  return new Failure(cause, __trace)
}
