import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import { Closeable } from '@/Fx/Scope/Closeable.js'

export class GetFiberScope extends Eff.Instruction<void, Closeable> {
  readonly tag = 'GetFiberScope'
}

export const getFiberScope = (__trace?: string): Fx<never, never, Closeable> =>
  new GetFiberScope(undefined, __trace)
