import { FxInstruction } from './FxInstruction.js'

import { Cause } from '@/Cause/Cause.js'

export class Logging extends FxInstruction<
  [message: string, cause: Cause<any> | Cause<never>],
  never,
  never,
  boolean
> {
  static tag = 'Logging' as const
  readonly tag = Logging.tag
}
