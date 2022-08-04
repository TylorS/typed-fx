import { Eff } from '@/Eff/Eff.js'
import type { FiberContext } from '@/Fx/FiberContext/index.js'

export class GetFiberContext extends Eff.Instruction<void, FiberContext> {
  readonly tag = 'GetFiberContext'

  readonly __R?: () => never
  readonly __E?: () => never
  readonly __A?: () => FiberContext
}
