import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberState } from '../FiberState.js'
import { InstructionProcessor, InstructionProcessors } from '../InstructionProcessor.js'
import { InstructionNode } from '../RuntimeInstruction.js'
import { RuntimeUpdate, Suspend } from '../RuntimeProcessor.js'

export function processInstructionNode(
  processors: InstructionProcessors,
  maxOpCount: NonNegativeInteger,
) {
  return (node: InstructionNode, state: FiberState): RuntimeUpdate => {
    const newOpCount = state.opCount + 1

    // Suspend when the opCount reaches our max
    if (newOpCount === maxOpCount) {
      return [new Suspend(), { ...state, opCount: 0 }]
    }

    const processor = processors[node.instruction.tag] as InstructionProcessor<
      typeof node.instruction
    >

    return processor(node.instruction, { ...state, opCount: newOpCount }, node)
  }
}
