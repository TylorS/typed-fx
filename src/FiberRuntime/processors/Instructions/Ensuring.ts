import { flow } from 'hkt-ts'

import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FinalizerNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Ensuring } from '@/Fx/Instructions/Ensuring.js'
import { provide } from '@/Fx/index.js'

export function processEnsuring<R, E, A>(
  ensuring: Ensuring<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const [fx, finalizer] = ensuring.input

  return [
    new Running(new FinalizerNode(fx, flow(finalizer, provide(state.env.value)), node)),
    state,
  ]
}
