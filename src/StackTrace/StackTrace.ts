import * as A from 'hkt-ts/Array'
import { isNonEmpty } from 'hkt-ts/NonEmptyArray'
import { NonNegativeInteger } from 'hkt-ts/number'

import * as Stack from '@/Stack/index.js'
import * as StackFrame from '@/StackFrame/index.js'
import * as Trace from '@/Trace/Trace.js'

const containsStackFrame = A.contains(StackFrame.Eq)

export class StackTrace {
  protected stack: Stack.Stack<Trace.Trace> | undefined

  constructor(readonly maxTraceCount: NonNegativeInteger) {}

  readonly push = (trace: Trace.Trace) => {
    if (trace.tag === 'StackFrameTrace') {
      this.trimExisting(trace.frames)
    }
  }

  /**
   * Pop the last
   */
  readonly pop = (): void => {
    if (this.stack) {
      this.stack = this.stack.pop()
    }
  }

  /**
   * Flatten a StackTrace into a single Trace
   */
  readonly flatten = (): Trace.Trace => {
    const frames = getUpTo(this.stack, this.maxTraceCount)

    return isNonEmpty(frames) ? new Trace.StackFrameTrace(frames) : Trace.EmptyTrace
  }

  /**
   * Push StackFrames onto the Stack but trim them to avoid repetition
   */
  protected trimExisting = (frames: ReadonlyArray<StackFrame.StackFrame>): void => {
    const current = getUpTo(this.stack, frames.length)
    const remaining = trimOverlappingTraces(current, frames)

    if (isNonEmpty(remaining)) {
      const trace = new Trace.StackFrameTrace(remaining)
      this.stack = this.stack?.push(trace) ?? new Stack.Stack<Trace.Trace>(trace)
    }
  }
}

function getUpTo(
  stack: Stack.Stack<Trace.Trace> | undefined,
  amount: number,
): ReadonlyArray<StackFrame.StackFrame> {
  const frames: Array<StackFrame.StackFrame> = []

  let current = stack

  while (current && frames.length < amount) {
    const trace = current.value

    if (trace.tag === 'StackFrameTrace') {
      frames.push(...trace.frames)
    }

    current = current.pop()
  }

  return frames.slice(0, amount)
}

function trimOverlappingTraces(
  current: ReadonlyArray<StackFrame.StackFrame>,
  incoming: ReadonlyArray<StackFrame.StackFrame>,
) {
  const existing = A.intersection(StackFrame.Eq)(incoming)(current)
  const containsFrame = (x: StackFrame.StackFrame) => containsStackFrame(x)(existing)

  return existing.length === 0
    ? incoming
    : incoming.filter((x) => (x.tag === 'Runtime' ? !containsFrame(x) : true))
}
