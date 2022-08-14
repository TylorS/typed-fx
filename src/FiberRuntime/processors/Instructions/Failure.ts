import { NonNegativeInteger } from 'hkt-ts/number'

import { Cause, traced } from '@/Cause/Cause.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FailureNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Failure } from '@/Fx/Instructions/Failure.js'
import { Stack } from '@/Stack/index.js'
import { StackFrame } from '@/StackFrame/StackFrame.js'
import { EmptyTrace, StackFrameTrace, Trace, trimOverlappingTraces } from '@/Trace/Trace.js'

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

// Traverse up the Stack<Trace> for a set amount of StackFrames.
export function getTraceUpTo(trace: Stack<Trace>, amount: number): Trace {
  const frames: Array<StackFrame> = []

  let current: Stack<Trace> | undefined = trace

  while (current && frames.length < amount) {
    if (current.value.tag === 'StackFrameTrace') {
      frames.push(...current.value.frames)
    }

    current = current.previous
  }

  return frames.length > 0 ? new StackFrameTrace(frames) : EmptyTrace
}

export function getTrimmedTrace<E>(cause: Cause<E>, stackTrace: Stack<Trace>) {
  const error =
    (cause.tag === 'Died' || cause.tag === 'Failed') && cause.error instanceof Error
      ? cause.error
      : new Error()
  const trace = Trace.runtime(error, processFailure)
  const toCompare = getTraceUpTo(stackTrace, trace.frames.length)

  return trimOverlappingTraces(toCompare, trace)
}
