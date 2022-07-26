import * as A from 'hkt-ts/Array'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import * as E from 'hkt-ts/Typeclass/Eq'

import * as Trace from '@/Fx/Trace/Trace.js'
import * as Stack from '@/Stack/index.js'
import * as StackFrame from '@/StackFrame/index.js'

export const Eq: E.Eq<StackTrace> = E.struct({
  trace: Stack.makeEq(Trace.Eq),
})

export class StackTrace {
  constructor(
    readonly trace: Stack.Stack<Trace.Trace> = new Stack.Stack<Trace.Trace>(
      new Trace.StackFrameTrace([]),
    ),
  ) {}

  readonly push = (trace: Trace.Trace): StackTrace =>
    trace.tag === 'EmptyTrace' ? this : new StackTrace(this.trace.push(trace))

  /**
   * Pop the last
   */
  readonly pop = (): StackTrace => new StackTrace(this.trace.pop())

  /**
   * Flatten a StackTrace into a single Trace
   */
  readonly flatten = (): Trace.Trace => A.foldLeft(Trace.Identity)(Array.from(this.trace).reverse())

  /**
   * Push StackFrames onto the Stack but trim them to avoid repition
   */
  readonly trimExisting = (frames: ReadonlyArray<StackFrame.StackFrame>): StackTrace => {
    const current = this.flatten()

    if (current.tag === 'EmptyTrace') {
      return this.push(isNonEmpty(frames) ? new Trace.StackFrameTrace(frames) : Trace.EmptyTrace)
    }

    const existing = A.intersection(StackFrame.Eq)(frames)(current.frames)
    const contains = A.contains(StackFrame.Eq)
    const containsFrame = (x: StackFrame.StackFrame) => contains(x)(existing)
    const remaining =
      existing.length === 0
        ? frames
        : frames.filter((x) => (x.tag === 'Runtime' ? !containsFrame(x) : true))

    return this.push(
      isNonEmpty(remaining) ? new Trace.StackFrameTrace(remaining) : Trace.EmptyTrace,
    )
  }
}
