import * as A from 'hkt-ts/Array'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import * as E from 'hkt-ts/Typeclass/Eq'

import * as Trace from '@/Fx/Trace/Trace'
import * as Stack from '@/Stack/index'
import * as StackFrame from '@/StackFrame/index'

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
  readonly flatten = (): Trace.Trace => A.foldLeft(Trace.Identity)(Array.from(this.trace))

  /**
   * Push StackFrames onto the Stack but trim them to avoid repition
   */
  readonly trimExisting = (frames: ReadonlyArray<StackFrame.StackFrame>): StackTrace => {
    const current = this.flatten()

    if (current.tag === 'EmptyTrace') {
      return this.push(isNonEmpty(frames) ? new Trace.StackFrameTrace(frames) : Trace.EmptyTrace)
    }

    const existing = A.intersection(StackFrame.Eq)(frames)(
      current.frames.filter((x) => x.tag === 'Runtime'),
    )
    const remaining = frames.filter(
      (x) => x.tag === 'Runtime' && A.contains(StackFrame.Eq)(x)(existing),
    )

    return this.push(
      isNonEmpty(remaining) ? new Trace.StackFrameTrace(remaining) : Trace.EmptyTrace,
    )
  }
}

export function captureTrace<E extends { readonly stack?: string }>(
  error?: E,
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): Trace.Trace {
  const frames = StackFrame.getStackFrames(error, targetObject)

  return isNonEmpty(frames) ? new Trace.StackFrameTrace(frames) : Trace.EmptyTrace
}
