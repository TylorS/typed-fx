import type { Exit } from '@/Exit/Exit'
import { FiberContext } from '@/FiberContext/index'
import type { FiberId } from '@/FiberId/FiberId'
import type { Of } from '@/Fx/Fx'
import { StackTrace } from '@/StackTrace/StackTrace'

export type Fiber<E, A> = LiveFiber<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, any> | Fiber<any, never> | Fiber<never, never>

export class LiveFiber<out E, out A> {
  readonly tag = 'Live' as const

  constructor(
    readonly id: FiberId,
    readonly context: Of<FiberContext>,
    readonly stack: Of<StackTrace>,
    readonly exit: Of<Exit<E, A>>,
    readonly inheritFiberRefs: Of<void>,
    readonly interrupt: (interruptingFiberId: FiberId) => Of<Exit<E, A>>,
  ) {}
}

export class SyntheticFiber<out E, out A> {
  readonly tag = 'Synthetic'

  constructor(
    readonly exit: Of<Exit<E, A>>,
    readonly inheritFiberRefs: Of<void>,
    readonly interrupt: (interruptingFiberId: FiberId) => Of<Exit<E, A>>,
  ) {}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Fiber {
  export type Live<E, A> = LiveFiber<E, A>
  export type Synthetic<E, A> = SyntheticFiber<E, A>

  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ErrorsOf<T> = [T] extends [Fiber<infer _E, infer _A>] ? _E : never
  export type OutputOf<T> = [T] extends [Fiber<infer _E, infer _A>] ? _A : never
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
