import { Left } from 'hkt-ts/Either'
import { NonNegativeInteger } from 'hkt-ts/number'

import { traced } from '@/Cause/Cause.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { ExitNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Failure } from '@/Fx/Instructions/Failure.js'
import { Stack } from '@/Stack/index.js'
import { StackFrame } from '@/StackFrame/StackFrame.js'
import { EmptyTrace, StackFrameTrace, Trace, trimOverlappingTraces } from '@/Trace/Trace.js'

export function processFailure(maxTraceCount: NonNegativeInteger) {
  return function processFailure<E>(failure: Failure<E>, state: FiberState): RuntimeUpdate {
    const cause = failure.input
    const error =
      (cause.tag === 'Died' || cause.tag === 'Failed') && cause.error instanceof Error
        ? cause.error
        : new Error()
    const trace = Trace.runtime(error)
    const toCompare = getTraceUpTo(state.trace, trace.frames.length)
    const remaining = trimOverlappingTraces(toCompare, trace)
    const updatedState: FiberState = { ...state, trace: state.trace.push(remaining) }

    return [
      new Running(
        new ExitNode(Left(traced(getTraceUpTo(updatedState.trace, maxTraceCount))(cause))),
      ),
      updatedState,
    ]
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
