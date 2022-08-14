import { pipe } from 'hkt-ts'
import { Left } from 'hkt-ts/Either'
import { Just, isJust } from 'hkt-ts/Maybe'
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

  console.log('Failure', prev.tag)

  switch (prev.tag) {
    case 'Initial': {
      return [new Running(new ExitNode(Left(node.error))), state]
    }
    case 'Exit': {
      return [new Done(concatExitSeq(prev.exit, Left(node.error))), state]
    }
    case 'Failure': {
      // Should never really happen
      return [
        new Running(new FailureNode(concatCauseSeq(prev.error, node.error), prev.previous)),
        state,
      ]
    }
    case 'Finalizer': {
      pipe(prev.exit, set(Just(Left(node.error))))

      return processFinalizerNode(prev, state)
    }
    case 'Fx': {
      return [new Running(new FailureNode(node.error, prev.previous)), state]
    }
    case 'Generator': {
      const prevCause = prev.cause.get()

      if (isJust(prevCause)) {
        return [new Running(new FailureNode(prevCause.value, prev.previous)), state]
      }

      setFailure(node.error, prev)

      return [new Running(prev), state]
    }
    case 'Instruction': {
      return [new Running(new FailureNode(node.error, prev.previous)), prev.pop(state)]
    }
    case 'Pop': {
      pipe(prev.exit, set(Just(Left(node.error))))

      return processPopNode(prev, state)
    }
  }
}
