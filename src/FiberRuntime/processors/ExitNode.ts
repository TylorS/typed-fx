import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { Eff } from '@/Eff/Eff.js'
import { Closeable, wait } from '@/Scope/Closeable.js'

export function processExitNode(scope: Closeable) {
  return (node: ExitNode, state: FiberState): readonly [RuntimeDecision, FiberState] => {
    return [
      new Running(
        new GeneratorNode(
          Eff.gen(
            Eff(function* () {
              const released = yield* scope.close(node.exit)

              if (released) {
                return node.exit
              }

              return yield* wait(scope)
            }),
          ),
          node,
        ),
      ),
      state,
    ]
  }
}
