import { FxInstruction } from './FxInstruction.js'

import { StackTrace } from '@/Trace/Trace.js'

export class GetTrace extends FxInstruction<void, never, never, StackTrace> {
  static tag = 'GetTrace' as const
  readonly tag = GetTrace.tag
}
