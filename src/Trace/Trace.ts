import { Maybe } from 'hkt-ts/Maybe'

import { StackFrame } from '@/StackFrame/StackFrame'

export type Trace = EmptyTrace | SourceLocationTrace

export const EmptyTrace = {
  tag: 'EmptyTrace',
} as const

export type EmptyTrace = typeof EmptyTrace

/**
 * TODO: Add the ability to parse locations from a string?
 */
export class SourceLocationTrace {
  readonly tag = 'SourceLocationTrace'

  constructor(readonly location: Maybe<StackFrame>, readonly trace?: string) {}
}
