import { FiberState } from './FiberState.js'
import { InstructionNode } from './RuntimeInstruction.js'
import { RuntimeDecision } from './RuntimeProcessor.js'

import { AnyInstruction } from '@/Fx/Instructions/Instruction.js'

export type InstructionProcessors = {
  readonly [K in AnyInstruction['tag']]: InstructionProcessor<
    Extract<AnyInstruction, { readonly tag: K }>
  >
}

export interface InstructionProcessor<I extends AnyInstruction> {
  (instruction: I, state: FiberState, node: InstructionNode): readonly [RuntimeDecision, FiberState]
}
