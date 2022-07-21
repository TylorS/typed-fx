import * as A from 'hkt-ts/Array'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import * as E from 'hkt-ts/Typeclass/Eq'

import * as FiberId from '@/FiberId/FiberId'
import * as Stack from '@/Stack/index'
import * as StackFrame from '@/StackFrame/index'
import * as Trace from '@/Trace/Trace'

export const Eq: E.Eq<StackTrace> = E.struct({
  fiberId: FiberId.Eq,
  trace: Stack.makeEq(Trace.Eq),
})

export class StackTrace {
  constructor(readonly fiberId: FiberId.FiberId, readonly trace: Stack.Stack<Trace.Trace>) {}

  readonly push = (trace: Trace.Trace) => new StackTrace(this.fiberId, this.trace.push(trace))

  readonly pop = () =>
    new StackTrace(this.fiberId, this.trace.pop() ?? new Stack.Stack<Trace.Trace>(Trace.EmptyTrace))

  readonly flatten = (): Trace.Trace => A.foldLeft(Trace.Identity)(Array.from(this.trace))
}

export function captureTrace<E extends { readonly stack?: string }>(
  error?: E,
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): Trace.Trace {
  const frames = StackFrame.getStackFrames(error, targetObject)

  return isNonEmpty(frames) ? new Trace.StackFrameTrace(frames) : Trace.EmptyTrace
}
