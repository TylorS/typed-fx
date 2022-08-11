import { FxInstruction } from './FxInstruction.js'

import type { Closeable } from '@/Scope/Closeable.js'

export class GetFiberScope extends FxInstruction<void, never, never, Closeable> {
  static tag = 'GetFiberScope' as const
  readonly tag = GetFiberScope.tag
}
