import { FiberState } from '../FiberState.js'
import { FxNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'

export function processFxNode(
  node: FxNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  return [new Running(new GeneratorNode(Eff.gen(node.fx as any), node.previous)), state]
}
