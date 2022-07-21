import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import type { StackFrame } from './StackFrame'
import { parseChrome } from './parseChromeStack'
import { parseGecko } from './parseGeckoStackFrame'

const lineRegex = /\s+at\s(?:(?<method>.+?)\s\()?(?<file>.+?):(?<line>\d+):(?<char>\d+)\)?\s*$/

export function getStackFrames<E extends { stack?: string } = Error>(
  error: E = new Error() as unknown as E,
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): ReadonlyArray<StackFrame> {
  if (!error.stack && Error.captureStackTrace) {
    Error.captureStackTrace(error, targetObject)
  }

  const stack = error.stack

  if (!stack) {
    return []
  }

  const stackFrames = stack
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length !== 0)
    .flatMap((s) => {
      const frame = parseChrome(s) || parseGecko(s)

      return frame ? [frame] : []
    })

  // Append all of the parents traces
  if (error instanceof Error && error.cause) {
    return [...stackFrames, ...getStackFrames(error.cause)]
  }

  return stackFrames
}

export function getCurrentStackFrame(
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): Maybe<StackFrame> {
  const error = new Error()

  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, targetObject)
  }

  const stack = error.stack

  if (!stack) {
    return Nothing
  }

  const frames = stack.split('\n').filter((x) => x.trim().length !== 0)

  for (const frame of frames) {
    if (frame.length === 0) {
      continue
    }

    const match = frame.match(lineRegex)

    if (!match || !match.groups) {
      continue
    }

    return Just({
      method: match.groups.method || '',
      file: match.groups.file || '',
      line: +match.groups.line,
      column: +match.groups.char,
    })
  }

  return Nothing
}
