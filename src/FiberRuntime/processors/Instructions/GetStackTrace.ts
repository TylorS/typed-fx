import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { GetStackTrace } from '@/Fx/Instructions/GetStackTrace.js'

export function processGetStackTrace(
  _: GetStackTrace,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  node.previous.next.set(state.trace)

  return [new Running(node.previous), state]
}
