import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as N from 'hkt-ts/number'
import * as S from 'hkt-ts/string'

export interface StackFrame {
  readonly method: string
  readonly file: string
  readonly line: number
  readonly column: number
}

export const Eq: E.Eq<StackFrame> = E.struct<StackFrame>({
  method: S.Eq,
  file: S.Eq,
  line: N.Eq,
  column: N.Eq,
})

export const Debug: D.Debug<StackFrame> = {
  debug: (frame) => `at ${frame.method} (${frame.file}:${frame.line}:${frame.column})`,
}
