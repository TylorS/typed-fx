import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import type { FiberRefs } from '@/Fx/FiberRefs/FiberRefs.js'

export class GetFiberRefs extends Eff.Instruction<void, FiberRefs> {}

export const getFiberRefs = (__trace?: string): Fx<never, never, FiberRefs> =>
  new GetFiberRefs(undefined, __trace)
