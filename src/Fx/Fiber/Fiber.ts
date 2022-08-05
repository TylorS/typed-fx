import { FiberContext } from '../FiberContext/FiberContext.js'
import type { Of } from '../Fx/Fx.js'
import type { Closeable } from '../Scope/Closeable.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberStatus } from '@/FiberStatus/index.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, never> | Fiber<any, never> | Fiber<never, any>

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly status: Of<FiberStatus>
  readonly exit: Of<Exit<E, A>>
  readonly context: Of<FiberContext>
  readonly scope: Of<Closeable>
}

export const Live = <E, A>(params: Omit<Live<E, A>, 'tag'>): Live<E, A> => ({
  tag: 'Live',
  ...params,
})

export interface Synthetic<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId.Synthetic
  readonly exit: Of<Exit<E, A>>
  readonly inheritFiberRefs: Of<void>
}

export const Synthetic = <E, A>(params: Omit<Synthetic<E, A>, 'tag'>): Synthetic<E, A> => ({
  tag: 'Synthetic',
  ...params,
})
