import { FxInstruction } from './FxInstruction.js'

import { Trace } from '@/Trace/Trace.js'

export class GetTrace extends FxInstruction<void, never, never, Trace> {
  readonly tag = 'GetTrace'
}
