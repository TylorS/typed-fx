// TODO: Add Maybe<Source> ??
export interface StackFrame {
  readonly method: string
  readonly file: string
  readonly line: number
  readonly column: number
}
