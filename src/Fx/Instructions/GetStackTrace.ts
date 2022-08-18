import { FxInstruction } from './FxInstruction.js'

import { StackTrace } from '@/Trace/Trace.js'

export class GetStackTrace extends FxInstruction<void, never, never, StackTrace> {
  static tag = 'GetStackTrace' as const
  readonly tag = GetStackTrace.tag
}
