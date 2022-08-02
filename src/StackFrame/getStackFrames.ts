import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import type { RuntimeStackFrame } from './StackFrame.js'
import { parseChrome } from './parseChromeStack.js'
import { parseGecko } from './parseGeckoStackFrame.js'

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
  if (error instanceof Error && error.cause) {
    return [...stackFrames, ...getStackFrames(error.cause)]
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

  const frames = stack
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length !== 0)

  for (const line of frames) {
    const frame = parseChrome(line) || parseGecko(line)

    if (frame) {
      return Just(frame)
    }
  }

  return Nothing
}
