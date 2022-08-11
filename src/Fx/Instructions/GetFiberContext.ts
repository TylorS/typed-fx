import { FxInstruction } from './FxInstruction.js'

import type { FiberContext } from '@/FiberContext/index.js'

export class GetFiberContext extends FxInstruction<void, never, never, FiberContext> {
  static tag = 'GetFiberContext' as const
  readonly tag = GetFiberContext.tag
}
