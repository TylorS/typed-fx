import { FxInstruction } from './FxInstruction.js'

import type { FiberContext } from '@/FiberContext/index.js'

export class GetFiberContext extends FxInstruction<void, never, never, FiberContext> {
  readonly tag = 'GetFiberContext'
}
