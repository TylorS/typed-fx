import { Eff } from '@/Eff/Eff.js'
import type { Closeable } from '@/Fx/Scope/Closeable.js'

export class GetFiberScope extends Eff.Instruction<void, Closeable> {
  readonly tag = 'GetFiberScope'

  readonly __R?: () => never
  readonly __E?: () => never
  readonly __A?: () => Closeable
}
