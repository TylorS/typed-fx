import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode, PopNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Provide } from '@/Fx/Instructions/Access.js'

export function processProvide<R, E, A>(
  provide: Provide<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const [fx, env] = provide.input
  const updatedState: FiberState = { ...state, env: state.env.push(env) }

  return [new Running(new PopNode(fx, popEnv, node)), updatedState]
}

const popEnv = (s: FiberState): FiberState => ({ ...s, env: s.env.pop() ?? s.env })
