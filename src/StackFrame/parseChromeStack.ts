import { StackFrame } from './StackFrame'

const chromeRe =
  /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i
const chromeEvalRe = /\((\S*)(?::(\d+))(?::(\d+))\)/

export function parseChrome(line: string): StackFrame | null {
  const parts = chromeRe.exec(line)

  if (!parts) {
    return null
  }

  const isNative = parts[2] && parts[2].indexOf('native') === 0 // start of line
  const isEval = parts[2] && parts[2].indexOf('eval') === 0 // start of line

  const submatch = chromeEvalRe.exec(parts[2])
  if (isEval && submatch != null) {
    // throw out eval line/column and use top-most line/column number
    parts[2] = submatch[1] // url
    parts[3] = submatch[2] // line
    parts[4] = submatch[3] // column
  }

  return {
    file: !isNative ? parts[2] : '',
    method: parts[1] || '',
    line: parts[3] ? +parts[3] : -1,
    column: parts[4] ? +parts[4] : -1,
  }
}
