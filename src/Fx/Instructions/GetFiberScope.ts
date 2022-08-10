import { FxInstruction } from './FxInstruction.js'

import type { Closeable } from '@/Scope/Closeable.js'

export class GetFiberScope extends FxInstruction<void, never, never, Closeable> {
  readonly tag = 'GetFiberScope'
}
