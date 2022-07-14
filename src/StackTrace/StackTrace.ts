import { isNonEmpty } from 'hkt-ts/NonEmptyArray'

import { FiberId } from '@/FiberId/FiberId'
import { Stack } from '@/Stack/index'
import { getStackFrames } from '@/StackFrame/getStackFrames'
import { EmptyTrace, StackFrameTrace, Trace } from '@/Trace/Trace'

export class StackTrace {
  constructor(readonly fiberId: FiberId, readonly trace: Stack<Trace>) {}

  readonly push = (trace: Trace) => new StackTrace(this.fiberId, this.trace.push(trace))

  readonly pop = () =>
    new StackTrace(this.fiberId, this.trace.pop() ?? new Stack<Trace>(EmptyTrace))
}

export function captureTrace<E extends { readonly stack?: string }>(
  error?: E,
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): Trace {
  const frames = getStackFrames(error, targetObject)

  return isNonEmpty(frames) ? new StackFrameTrace(frames) : EmptyTrace
}
