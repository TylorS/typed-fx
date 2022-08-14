import { pipe } from 'hkt-ts'
import { match } from 'hkt-ts/Either'
import { isNothing } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Associative'

import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode, PopNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { setFailure } from './setFailure.js'

import { set } from '@/Atomic/Atomic.js'
import { Eff } from '@/Eff/Eff.js'
import { interrupt, makeSequentialAssociative } from '@/Exit/Exit.js'

const concatExitSeq = makeSequentialAssociative<never, never>(First as any).concat

export function processPopNode(
  node: PopNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  const exit = node.exit.get()

  if (isNothing(exit)) {
    return [new Running(new GeneratorNode(Eff.gen(node.fx as any), node)), state]
  }

  const previousState = node.pop(state)

  if (
    node.previous.instruction.tag === 'SetInterruptStatus' &&
    previousState.interruptStatus.value &&
    previousState.interruptedBy.size > 0
  ) {
    return [
      new Running(
        new ExitNode(Array.from(previousState.interruptedBy).map(interrupt).reduce(concatExitSeq)),
      ),
      previousState,
    ]
  }

  const previous = node.previous.previous

  // Update the Previous Node with the Exit value
  pipe(
    exit.value,
    match(
      (cause) => setFailure(cause, previous),
      (value) => pipe(previous.next, set(value)),
    ),
  )

  return [new Running(previous), previousState]
}
