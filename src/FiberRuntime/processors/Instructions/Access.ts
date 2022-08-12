import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FxNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Access } from '@/Fx/Instructions/Access.js'

export function processAccess<R, R2, E, A>(
  access: Access<R, R2, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  return [new Running(new FxNode(access.input(state.env.value), node)), state]
}
