import { Exit } from '../Exit/Exit.js'
import { FiberId } from '../FiberId/FiberId.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Of } from '../Fx/Fx.js'

import { Closeable } from '@/Fx/Scope/Closeable.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, any>

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly exit: Of<Exit<E, A>>
  readonly inheritRefs: Of<void>
  readonly scope: Closeable
  readonly fiberRefs: FiberRefs
}

export const Live = <E, A>(
  id: FiberId.Live,
  exit: Of<Exit<E, A>>,
  inheritRefs: Of<void>,
  scope: Closeable,
  fiberRefs: FiberRefs,
): Live<E, A> => ({
  tag: 'Live',
  id,
  exit,
  inheritRefs,
  scope,
  fiberRefs,
})

export interface Synthetic<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId.Synthetic
  readonly exit: Of<Exit<E, A>>
  readonly inheritRefs: Of<void>
  readonly fiberRefs: FiberRefs
}

export const Synthetic = <E, A>(
  id: FiberId.Synthetic,
  exit: Of<Exit<E, A>>,
  inheritRefs: Of<void>,
  fiberRefs: FiberRefs,
): Synthetic<E, A> => ({
  tag: 'Synthetic',
  id,
  exit,
  inheritRefs,
  fiberRefs,
})
