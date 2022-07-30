import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import type { FiberContext } from '@/Fx/FiberContext/FiberContext.js'

export class GetFiberContext extends Eff.Instruction<void, FiberContext> {
  readonly tag = 'GetFiberContext'
}

export const getFiberContext = (__trace?: string): Fx<never, never, FiberContext> =>
  new GetFiberContext(undefined, __trace)
