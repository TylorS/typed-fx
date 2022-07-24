import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as N from 'hkt-ts/number'
import * as S from 'hkt-ts/string'

export type StackFrame = InstrumentedStackFrame | RuntimeStackFrame | CustomStackFrame

export interface InstrumentedStackFrame {
  readonly tag: 'Instrumented'
  readonly file: string
  readonly method: string
  readonly line: number
  readonly column: number
}

export interface RuntimeStackFrame {
  readonly tag: 'Runtime'
  readonly file: string
  readonly method: string
  readonly line: number
  readonly column: number
}

export interface CustomStackFrame {
  readonly tag: 'Custom'
  readonly trace: string
}

export const Eq: E.Eq<StackFrame> = E.sum<StackFrame>()('tag')({
  Instrumented: E.struct({
    tag: E.AlwaysEqual,
    file: S.Eq,
    method: S.Eq,
    line: N.Eq,
    column: N.Eq,
  }),
  Runtime: E.struct({
    tag: E.AlwaysEqual,
    file: S.Eq,
    method: S.Eq,
    line: N.Eq,
    column: N.Eq,
  }),
  Custom: E.struct({
    tag: E.AlwaysEqual,
    trace: S.Eq,
  }),
})

export const Debug: D.Debug<StackFrame> = {
  debug: (frame) =>
    frame.tag === 'Custom'
      ? frame.trace
      : `at ${frame.method} (${frame.file}:${frame.line}:${frame.column})`,
}

export const debug = Debug.debug

export type StackFrames = ReadonlyArray<StackFrame>

export const StackFramesDebug: D.Debug<StackFrames> = {
  debug: (frames) => frames.map(debug).join('\n'),
}
