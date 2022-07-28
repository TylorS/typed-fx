import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import type { RuntimeStackFrame } from './StackFrame.js'
import { parseChrome } from './parseChromeStack.js'
import { parseGecko } from './parseGeckoStackFrame.js'

const lineRegex = /\s+at\s(?:(?<method>.+?)\s\()?(?<file>.+?):(?<line>\d+):(?<char>\d+)\)?\s*$/

export function getStackFrames<E extends { stack?: string } = Error>(
  error: E = {} as E,
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): ReadonlyArray<RuntimeStackFrame> {
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
  if (error instanceof Error && error.causedBy) {
    return [...stackFrames, ...getStackFrames(error.causedBy)]
  }

  return stackFrames
}

export function getCurrentStackFrame(
  // eslint-disable-next-line @typescript-eslint/ban-types
  targetObject?: Function,
): Maybe<RuntimeStackFrame> {
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
      tag: 'Runtime',
      method: match.groups.method || '',
      file: match.groups.file || '',
      line: +match.groups.line,
      column: +match.groups.char,
    })
  }

  return Nothing
}
