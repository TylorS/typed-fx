import { isRight } from 'hkt-ts/Either'

import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FxNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Join } from '@/Fx/Instructions/Join.js'
import { Fx, fromExit, inheritFiberRefs } from '@/Fx/index.js'

export function processJoin<E, A>(
  join: Join<E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  return [
    new Running(
      new FxNode(
        Fx(function* () {
          const fiber = join.input
          const exit = yield* fiber.exit

          if (isRight(exit)) {
            yield* inheritFiberRefs(fiber)
          }

          return yield* fromExit(exit)
        }),
        node,
      ),
    ),
    state,
  ]
}
