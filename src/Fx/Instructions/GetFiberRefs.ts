import { FxInstruction } from './FxInstruction.js'

import type { FiberRefs } from '@/FiberRefs/index.js'

export class GetFiberRefs extends FxInstruction<void, never, never, FiberRefs> {
  static tag = 'GetFiberRefs' as const
  readonly tag = GetFiberRefs.tag
}
