import { isNothing } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { FinalizerNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'
import { Fx, fromExit } from '@/Fx/Fx.js'

export function processFinalizerNode(node: FinalizerNode, state: FiberState): RuntimeUpdate {
  const exit = node.exit.get()

  if (isNothing(exit)) {
    return [new Running(new GeneratorNode(Eff.gen(node.fx as any), node)), state]
  }

  return [
    new Running(
      new GeneratorNode(
        Eff.gen(
          Fx(function* () {
            yield* node.finalizer(exit.value)

            return yield* fromExit(exit.value)
          }),
        ),
        node.previous,
      ),
    ),
    state,
  ]
}
