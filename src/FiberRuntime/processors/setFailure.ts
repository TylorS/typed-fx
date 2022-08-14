import { pipe } from 'hkt-ts'
import { Just } from 'hkt-ts/Maybe'

import { GeneratorNode } from '../RuntimeInstruction.js'

import { set } from '@/Atomic/Atomic.js'
import { Cause } from '@/Cause/Cause.js'
import { CauseError } from '@/Cause/CauseError.js'

export function setFailure(cause: Cause<any>, node: GeneratorNode) {
  pipe(node.method, set('throw'))
  pipe(node.next, set(getCauseError(cause)))
  pipe(node.cause, set(Just(cause)))
}

export function getCauseError<E>(cause: Cause<E>): Error {
  if (cause.tag === 'Traced') {
    return getCauseError(cause.cause)
  }

  if ((cause.tag === 'Died' || cause.tag === 'Failed') && cause.error instanceof Error) {
    return cause.error
  }

  return new CauseError(cause)
}
