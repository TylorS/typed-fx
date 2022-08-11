import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberState } from '../FiberState.js'
import { InstructionProcessor, InstructionProcessors } from '../InstructionProcessor.js'
import { InstructionNode } from '../RuntimeInstruction.js'
import { RuntimeDecision, Suspend } from '../RuntimeProcessor.js'

export function processInstructionNode(
  processors: InstructionProcessors,
  maxOpCount: NonNegativeInteger,
) {
  return <R, E, A>(
    node: InstructionNode<R, E, A>,
    state: FiberState,
  ): readonly [RuntimeDecision<R, E, A>, FiberState] => {
    const newOpCount = state.opCount + 1

    // Suspend when the opCount reaches our max
    if (newOpCount === maxOpCount) {
      return [new Suspend(), { ...state, opCount: 0 }]
    }

    const prcessor = processors[node.instruction.tag] as InstructionProcessor<
      typeof node.instruction
    >

    return prcessor(node.instruction, { ...state, opCount: newOpCount }, node)
  }
}
