import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'
import { Closeable } from '@/Scope/Closeable.js'

export function processExitNode(scope: Closeable) {
  return <E, A>(
    node: ExitNode<E, A>,
    state: FiberState,
  ): readonly [RuntimeDecision<any, E, A>, FiberState] => {
    return [new Running(new GeneratorNode(Eff.gen(scope.close(node.exit)), node)), state]
  }
}
