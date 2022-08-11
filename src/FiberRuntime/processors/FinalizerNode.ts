import { isNothing } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { FinalizerNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'

export function processFinalizerNode<R, E, A>(
  node: FinalizerNode<R, E, A>,
  state: FiberState,
): readonly [RuntimeDecision<R, E, A>, FiberState] {
  const exit = node.exit.get()

  if (isNothing(exit)) {
    return [new Running(new GeneratorNode(Eff.gen(node.fx), node)), state]
  }

  return [new Running(new GeneratorNode(Eff.gen(node.finalizer(exit.value)), node.previous)), state]
}
