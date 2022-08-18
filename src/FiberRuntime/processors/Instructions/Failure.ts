import { NonNegativeInteger } from 'hkt-ts/number'

import { traced } from '@/Cause/Cause.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FailureNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Failure } from '@/Fx/Instructions/Failure.js'
import { getTraceUpTo, getTrimmedTrace } from '@/Trace/Trace.js'

export function processFailure(maxTraceCount: NonNegativeInteger) {
  return function processFailure<E>(
    failure: Failure<E>,
    state: FiberState,
    node: InstructionNode,
  ): RuntimeUpdate {
    const cause = traced(
      getTraceUpTo(state.trace.push(getTrimmedTrace(failure.input, state.trace)), maxTraceCount),
    )(failure.input)

    return [new Running(new FailureNode(cause, node)), state]
  }
}
