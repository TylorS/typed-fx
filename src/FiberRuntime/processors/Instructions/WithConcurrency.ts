import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode, PopNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { WithConcurrency } from '@/Fx/Instructions/WithConcurrency.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'

export function processWithConcurrency<R, E, A>(
  withConcurrency: WithConcurrency<R, E, A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  const [fx, concurrencyLevel] = withConcurrency.input

  return [
    new Running(new PopNode(fx, popConcurrencyLevel, node)),
    {
      ...state,
      concurrencyLevel: state.concurrencyLevel.push(new Semaphore(concurrencyLevel)),
    },
  ]
}

const popConcurrencyLevel = (s: FiberState) => ({
  ...s,
  concurrencyLevel: s.concurrencyLevel.pop() ?? s.concurrencyLevel,
})
