import { Just } from 'hkt-ts/Maybe'

import { GeneratorNode } from '../RuntimeInstruction.js'

import { Cause } from '@/Cause/Cause.js'
import { CauseError } from '@/Cause/CauseError.js'

export function setFailure(cause: Cause<any>, node: GeneratorNode) {
  node.method.set('throw')
  node.next.set(getCauseError(cause))
  node.cause.set(Just(cause))
}

export function getCauseError<E>(cause: Cause<E>): Error {
  if (cause.tag === 'Traced') {
    return getCauseError(cause.cause)
  }

  if ((cause.tag === 'Unexpected' || cause.tag === 'Expected') && cause.error instanceof Error) {
    return cause.error
  }

  return new CauseError(cause)
}
