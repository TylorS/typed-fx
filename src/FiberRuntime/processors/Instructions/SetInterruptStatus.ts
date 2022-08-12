import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode, PopNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { SetInterruptStatus } from '@/Fx/Instructions/SetInterruptStatus.js'

export function processSetInterruptStatus<R, E, A>(
  setInterruptStatus: SetInterruptStatus<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const [fx, interruptStatus] = setInterruptStatus.input
  const updatedState: FiberState = {
    ...state,
    interruptStatus: state.interruptStatus.push(interruptStatus),
  }

  return [new Running(new PopNode(fx, popInterruptStatus, node)), updatedState]
}

const popInterruptStatus = (s: FiberState): FiberState => ({
  ...s,
  interruptStatus: s.interruptStatus.pop() ?? s.interruptStatus,
})
