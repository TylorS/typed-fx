import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import type { Live } from '@/Fiber/Fiber.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import type { Closeable } from '@/Scope/Closeable.js'
import type { Scope } from '@/Scope/Scope.js'
import type { StackTrace } from '@/Trace/Trace.js'

export interface ForkParams extends FiberContext {
  readonly trace?: StackTrace
  readonly scope?: Closeable // Scope to use explicitly for this Fiber
  readonly forkScope?: Scope // Scope to use to fork for this Fiber, used only when `scope` is not provided.
}

export class Fork<R, E, A> extends FxInstruction<
  readonly [Fx<R, E, A>, ForkParams],
  R,
  never,
  Live<E, A>
> {
  static tag = 'Fork' as const
  readonly tag = Fork.tag
}
