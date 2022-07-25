import * as A from 'hkt-ts/Array'
import * as ASSOC from 'hkt-ts/Typeclass/Associative'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'

import * as StackFrame from '@/StackFrame/index'
import { StackFrames } from '@/StackFrame/index'

export type Trace = EmptyTrace | StackFrameTrace

const INSTRUMENTED_REGEX = /^[a-z]+:[a-z]+:[0-9]+:[0-9]+$/i

export namespace Trace {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const runtime = (targetObject?: Function) =>
    new StackFrameTrace(StackFrame.getStackFrames(undefined, targetObject))

  export const custom = (trace: string): StackFrameTrace => {
    if (!INSTRUMENTED_REGEX.test(trace)) {
      return new StackFrameTrace([
        {
          tag: 'Custom',
          trace,
        },
      ])
    }

    const [file, method, line, column] = trace.split(/:/g)
    const stackFrame: StackFrame.StackFrame = {
      tag: 'Instrumented',
      file,
      method,
      line: parseFloat(line),
      column: parseFloat(column),
    }

    return new StackFrameTrace([stackFrame])
  }
}

export const EmptyTrace = {
  tag: 'EmptyTrace',
} as const

export type EmptyTrace = typeof EmptyTrace

export class StackFrameTrace {
  readonly tag = 'StackFrameTrace'

  constructor(readonly frames: StackFrames) {}
}

export const Eq: E.Eq<Trace> = E.sum<Trace>()('tag')({
  EmptyTrace: E.AlwaysEqual,
  StackFrameTrace: E.struct<StackFrameTrace>({
    tag: E.AlwaysEqual,
    frames: A.makeEq(StackFrame.Eq),
  }),
})

export const Associative: ASSOC.Associative<Trace> = {
  concat: (f, s) => {
    if (f.tag === EmptyTrace.tag) {
      return s
    }

    if (s.tag === EmptyTrace.tag) {
      return f
    }

    return new StackFrameTrace([...s.frames, ...f.frames])
  },
}

export const Identity: I.Identity<Trace> = {
  ...Associative,
  id: EmptyTrace,
}

export const Debug: D.Debug<Trace> = D.sum<Trace>()('tag')({
  EmptyTrace: {
    debug: () => `<empty trace>`,
  },
  StackFrameTrace: {
    debug: ({ frames }) => frames.map(StackFrame.debug).join('\n'),
  },
})
