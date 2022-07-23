import * as A from 'hkt-ts/Array'
import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'
import * as ASSOC from 'hkt-ts/Typeclass/Associative'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'
import * as S from 'hkt-ts/string'

import * as StackFrame from '@/StackFrame/index'

export type Trace = EmptyTrace | StackFrameTrace

export const EmptyTrace = {
  tag: 'EmptyTrace',
} as const

export type EmptyTrace = typeof EmptyTrace

/**
 * TODO: Add the ability to parse locations from a string?
 */
export class StackFrameTrace {
  readonly tag = 'StackFrameTrace'

  constructor(readonly frames: NonEmptyArray<StackFrame.StackFrame>) {}
}

export const Eq: E.Eq<Trace> = E.sum<Trace>()('tag')({
  EmptyTrace: E.struct<EmptyTrace>({ tag: S.Eq }),
  StackFrameTrace: E.struct<StackFrameTrace>({ tag: S.Eq, frames: A.makeEq(StackFrame.Eq) }),
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
