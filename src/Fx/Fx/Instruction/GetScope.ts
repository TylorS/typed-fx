import { Fx } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'
import { Closeable } from '@/Scope/Closeable.js'

export class GetScope extends Eff.Instruction<void, Closeable> {}

export const getScope = (__trace?: string): Fx<never, never, Closeable> =>
  new GetScope(undefined, __trace)
