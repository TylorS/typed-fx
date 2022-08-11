import { FiberState } from '../FiberState.js'
import { GeneratorNode, InitialNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'

export function processInitialNode<R, E, A>(
  node: InitialNode<R, E, A>,
  state: FiberState,
): readonly [RuntimeDecision<R, E, A>, FiberState] {
  return [new Running(new GeneratorNode(Eff.gen(node.fx), node)), state]
}
