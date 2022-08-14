import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Await, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { unit } from '@/Fx/Fx.js'
import { Wait } from '@/Fx/Instructions/Wait.js'

export function processWait<R, E, A>(
  wait: Wait<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  return [new Await(wait.input, () => unit, node), state]
}
