import type { Exit } from '@/Exit/Exit'
import type { FiberId } from '@/FiberId/FiberId'
import { FiberScope } from '@/FiberScope/index'
import type { Of } from '@/Fx/Fx'
import { StackTrace } from '@/StackTrace/StackTrace'

export interface Fiber<out E, out A> {
  readonly id: FiberId
  readonly scope: FiberScope
  readonly stack: Of<StackTrace>
  readonly exit: Of<Exit<E, A>>
  readonly inheritFiberRefs: Of<void>
}

export type AnyFiber = Fiber<any, any> | Fiber<never, any> | Fiber<any, never> | Fiber<never, never>
