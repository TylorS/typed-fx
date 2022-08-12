import { FiberState } from '../FiberState.js'
import { GeneratorNode, InitialNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'

export function processInitialNode(
  node: InitialNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  return [new Running(new GeneratorNode(Eff.gen(node.fx as any), node)), state]
}
