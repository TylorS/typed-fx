import * as A from 'hkt-ts/Array'
import * as ASSOC from 'hkt-ts/Typeclass/Associative'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'

import * as StackFrame from '@/StackFrame/index.js'

export type Trace = EmptyTrace | StackFrameTrace

const INSTRUMENTED_REGEX = /^.+\s.+:[0-9]+:[0-9]+$/i

export const isInstrumentedTrace = (trace: string) => INSTRUMENTED_REGEX.test(trace)

export namespace Trace {
  export const runtime = <E extends { stack?: string } = Error>(
    error: E,
    // eslint-disable-next-line @typescript-eslint/ban-types
    targetObject?: Function,
  ) => new StackFrameTrace(StackFrame.getStackFrames(error, targetObject))

  export const custom = (trace: string): StackFrameTrace => {
    if (!isInstrumentedTrace(trace)) {
      return new StackFrameTrace([
        {
          tag: 'Custom',
          trace,
        },
      ])
    }

    const [methodFile, line, column] = trace.split(/:/g)
    const [method, file] = methodFile.split(/\s/)
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

  constructor(readonly frames: StackFrame.StackFrames) {}
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
