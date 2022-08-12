import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode, PopNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { AddTrace } from '@/Fx/Instructions/AddTrace.js'

export function processAddTrace<R, E, A>(
  addTrace: AddTrace<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const [fx, trace] = addTrace.input
  const updatedState: FiberState = { ...state, trace: state.trace.push(trace) }

  return [new Running(new PopNode(fx, popTrace, node)), updatedState]
}

const popTrace = (s: FiberState): FiberState => ({ ...s, trace: s.trace.pop() ?? s.trace })
