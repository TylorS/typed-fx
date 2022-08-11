import { FiberState } from '../FiberState.js'
import { FxNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'

export function processFxNode<R, E, A>(
  node: FxNode<R, E, A>,
  state: FiberState,
): readonly [RuntimeDecision<R, E, A>, FiberState] {
  return [new Running(new GeneratorNode(Eff.gen(node.fx), node.previous)), state]
}
