import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { GetTrace } from '@/Fx/Instructions/GetTrace.js'

export function processGetTrace(
  _: GetTrace,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  node.previous.next.set(state.trace)

  return [new Running(node.previous), state]
}
