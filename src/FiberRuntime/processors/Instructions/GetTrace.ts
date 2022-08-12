import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { getTraceUpTo } from './Failure.js'

import { set } from '@/Atomic/Atomic.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { GetTrace } from '@/Fx/Instructions/GetTrace.js'

export function processGetTrace(maxTraceCount: NonNegativeInteger) {
  return (_: GetTrace, state: FiberState, node: InstructionNode): RuntimeUpdate => {
    pipe(node.previous.next, set(getTraceUpTo(state.trace, maxTraceCount)))

    return [new Running(node.previous), state]
  }
}
