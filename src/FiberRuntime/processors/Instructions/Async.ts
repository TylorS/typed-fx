import { isRight } from 'hkt-ts/Either'

import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FxNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Await, Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { provide } from '@/Fx/Fx.js'
import { Async } from '@/Fx/Instructions/Async.js'

export function processAsync<R, E, A>(
  async: Async<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const future = Pending<R, E, A>()
  const either = async.input(complete(future))

  if (isRight(either)) {
    return [new Running(new FxNode(either.right, node)), state]
  }

  const env = state.env.value

  return [new Await(future, () => provide(env)(either.left), node), state]
}
