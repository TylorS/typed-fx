import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { GetFiberScope } from '@/Fx/Instructions/GetFiberScope.js'
import { Closeable } from '@/Scope/Closeable.js'

export function processGetFiberScope(scope: Closeable) {
  return (_: GetFiberScope, state: FiberState, node: InstructionNode): RuntimeUpdate => {
    node.previous.next.set(scope)

    return [new Running(node.previous), state]
  }
}
