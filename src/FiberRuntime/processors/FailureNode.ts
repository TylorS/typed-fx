import { pipe } from 'hkt-ts'
import { Left } from 'hkt-ts/Either'
import { Just, getOrElse, isNothing } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'

import { FiberState } from '../FiberState.js'
import { ExitNode, FailureNode } from '../RuntimeInstruction.js'
import { Done, Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { processFinalizerNode } from './FinalizerNode.js'
import { processPopNode } from './PopNode.js'
import { setFailure } from './setFailure.js'

import { set } from '@/Atomic/Atomic.js'
import * as Cause from '@/Cause/Cause.js'
import * as Exit from '@/Exit/Exit.js'

const concatCauseSeq = Cause.makeSequentialAssociative<any>().concat
const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat

export function processFailureNode(
  node: FailureNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  const prev = node.previous
  const exit = Left(node.error)

  switch (prev.tag) {
    case 'Initial': {
      return [new Running(new ExitNode(exit)), state]
    }
    case 'Exit': {
      return [new Done(concatExitSeq(prev.exit, exit)), state]
    }
    case 'Failure': {
      // Should never really happen
      return [
        new Running(new FailureNode(concatCauseSeq(prev.error, node.error), prev.previous)),
        state,
      ]
    }
    case 'Finalizer': {
      pipe(prev.exit, set(Just(exit)))

      return processFinalizerNode(prev, state)
    }
    case 'Fx': {
      return [new Running(new FailureNode(node.error, prev.previous)), state]
    }
    case 'Generator': {
      const prevCause = prev.cause.get()

      // If we haven't tried to throw this error into the generator yet, and is currently uncaught allow
      // the generator to try to catch it.
      if (isNothing(prevCause) && shouldRethrow(node.error)) {
        setFailure(node.error, prev)

        return [new Running(prev), state]
      }

      // Otherwise continue processing the rest of the Stack with this error.
      return [
        new Running(
          new FailureNode(
            pipe(
              prevCause,
              getOrElse(() => node.error),
            ),
            prev.previous,
          ),
        ),
        state,
      ]
    }
    case 'Instruction': {
      return [new Running(new FailureNode(node.error, prev.previous)), prev.pop(state)]
    }
    case 'Pop': {
      pipe(prev.exit, set(Just(exit)))

      return processPopNode(prev, state)
    }
  }
}

function shouldRethrow(error: Cause.Cause<any>): boolean {
  return error.tag === 'Died' || (error.tag === 'Traced' && shouldRethrow(error.cause))
}
