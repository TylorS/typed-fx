import type { Fx } from '../Fx.js'

import { Eff } from '@/Eff/Eff.js'
import type { Live } from '@/Fx/Fiber/Fiber.js'
import type { FiberContext } from '@/Fx/FiberContext/FiberContext.js'
import type { Closeable } from '@/Fx/Scope/Closeable.js'
import type { Scope } from '@/Fx/Scope/Scope.js'

export interface ForkParams extends Partial<FiberContext> {
  readonly scope?: Closeable
  readonly forkScope?: Scope
}

export class Fork<R, E, A> extends Eff.Instruction<
  readonly [Fx<R, E, A>, ForkParams?],
  Live<E, A>
> {
  readonly tag = 'Fork'

  readonly __R?: () => R
  readonly __E?: () => never
  readonly __A?: () => Live<E, A>
}
