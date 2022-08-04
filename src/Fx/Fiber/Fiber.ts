import { Of } from '../Fx/Fx.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, never> | Fiber<any, never> | Fiber<never, any>

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly exit: Of<Exit<E, A>>
}

export interface Synthetic<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId.Synthetic
  readonly exit: Of<Exit<E, A>>
}