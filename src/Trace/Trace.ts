import { pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import * as ASSOC from 'hkt-ts/Typeclass/Associative'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'
import * as O from 'hkt-ts/Typeclass/Ord'
import * as N from 'hkt-ts/number'
import * as S from 'hkt-ts/string'

import type { Cause } from '@/Cause/index.js'
import { Stack } from '@/Stack/index.js'
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

export const Ord: O.Ord<Trace> = O.sum<Trace>()('tag')(
  pipe(
    N.Ord,
    O.contramap((a) => (a === 'EmptyTrace' ? 0 : 1)),
  ),
)({
  EmptyTrace: O.Static,
  StackFrameTrace: O.struct<StackFrameTrace>({
    tag: O.Static,
    frames: A.makeOrd(StackFrame.Ord),
  })(S.Ord),
})

export const Associative: ASSOC.Associative<Trace> = {
  concat: (f, s) => {
    if (f.tag === EmptyTrace.tag) {
      return s
    }

    if (s.tag === EmptyTrace.tag) {
      return f
    }

    return new StackFrameTrace([...f.frames, ...s.frames])
  },
}

export const concat = Associative.concat

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

export const debug = Debug.debug

export function trimOverlappingTraces(current: Trace, incoming: Trace): Trace {
  if (current.tag === EmptyTrace.tag) {
    return incoming
  }

  if (incoming.tag === EmptyTrace.tag) {
    return current
  }

  const frames = trimOverlappingFrames(
    current.frames.slice(0, incoming.frames.length), // Only compare the same amount of values
    incoming.frames,
  )

  return frames.length === 0
    ? EmptyTrace
    : new StackFrameTrace(trimOverlappingFrames(current.frames, incoming.frames))
}

function trimOverlappingFrames(
  current: ReadonlyArray<StackFrame.StackFrame>,
  incoming: ReadonlyArray<StackFrame.StackFrame>,
): ReadonlyArray<StackFrame.StackFrame> {
  // Clone our Array for mutation
  const outgoing: Array<StackFrame.StackFrame> = [...incoming]

  let cIndex = current.length - 1
  let iIndex = 0
  let deleted = 0

  for (; cIndex > -1 && iIndex < incoming.length; ) {
    const c = current[cIndex]
    const i = incoming[iIndex]

    // If neither are Runtime instructions, lets just break early
    if (!(c.tag === 'Runtime' || i.tag === 'Runtime')) {
      break
    }

    // Skip over custom/instrumented traces
    if (c.tag !== 'Runtime') {
      cIndex--

      continue
    }
    if (i.tag !== 'Runtime') {
      iIndex++

      continue
    }

    // If we don't have a match, just break
    if (!StackFrame.Eq.equals(c, i)) {
      break
    }

    // Remove this Trace
    outgoing.splice(iIndex - deleted++, 1)
    cIndex--
    iIndex++
  }

  return outgoing
}

export interface StackTrace extends Stack<Trace> {}

// Traverse up the Stack<Trace> for a set amount of StackFrames.
export function getTraceUpTo(trace: StackTrace, amount: number): Trace {
  const frames: Array<StackFrame.StackFrame> = []

  let current: StackTrace | null = trace

  while (current && frames.length < amount) {
    if (current.value.tag === 'StackFrameTrace') {
      frames.push(...current.value.frames)
    }

    current = current.previous
  }

  return frames.length > 0 ? new StackFrameTrace(frames) : EmptyTrace
}

export function getTrimmedTrace<E>(cause: Cause<E>, stackTrace: StackTrace) {
  const error =
    (cause.tag === 'Unexpected' || cause.tag === 'Expected') && cause.error instanceof Error
      ? cause.error
      : new Error()
  const trace = Trace.runtime(error, getTrimmedTrace)
  const toCompare = getTraceUpTo(stackTrace, trace.frames.length)

  return trimOverlappingTraces(toCompare, trace)
}
