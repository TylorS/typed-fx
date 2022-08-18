import { FiberContext } from '@/FiberContext/index.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { GetFiberContext } from '@/Fx/Instructions/GetFiberContext.js'

export function processGetFiberContext(initial: FiberContext) {
  return (_: GetFiberContext, state: FiberState, node: InstructionNode): RuntimeUpdate => {
    const context: FiberContext = {
      ...initial,
      concurrencyLevel: state.concurrencyLevel.value.maxPermits,
      interruptStatus: state.interruptStatus.value,
    }

    node.previous.next.set(context)

    return [new Running(node.previous), state]
  }
}
