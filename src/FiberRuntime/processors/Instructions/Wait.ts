import { FiberId } from '@/FiberId/FiberId.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Await, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { interruptAs } from '@/Future/interruptAs.js'
import { fromLazy } from '@/Fx/Fx.js'
import { Wait } from '@/Fx/Instructions/Wait.js'

export function processWait(id: FiberId.Live) {
  return <R, E, A>(
    wait: Wait<R, E, A>,
    state: FiberState,
    node: InstructionNode,
  ): RuntimeUpdate => {
    return [new Await(wait.input, () => fromLazy(() => interruptAs(wait.input)(id)), node), state]
  }
}
