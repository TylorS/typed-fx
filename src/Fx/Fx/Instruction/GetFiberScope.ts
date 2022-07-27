import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import { FiberScope } from '@/Fx/Fiber/FiberScope.js'

export class GetFiberScope extends Eff.Instruction<void, FiberScope> {}

export const getFiberScope = (__trace?: string): Fx<never, never, FiberScope> =>
  new GetFiberScope(undefined, __trace)
