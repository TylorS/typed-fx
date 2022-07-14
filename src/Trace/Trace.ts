import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'

import { StackFrame } from '@/StackFrame/StackFrame'

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

  constructor(readonly frames: NonEmptyArray<StackFrame>) {}
}
