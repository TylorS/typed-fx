import { Exit } from '@/Exit/Exit.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberStatus } from '@/FiberStatus/index.js'
import type { Of } from '@/Fx/Fx.js'
import type { Closeable } from '@/Scope/Closeable.js'
import { Trace } from '@/Trace/Trace.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, never> | Fiber<any, never> | Fiber<never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ErrorsOf<T> = [T] extends [Fiber<infer E, infer _A>] ? E : never

export type OutputOf<T> = [T] extends [Fiber<infer _E, infer A>] ? A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly status: Of<FiberStatus>
  readonly exit: Of<Exit<E, A>>
  readonly context: Of<FiberContext>
  readonly scope: Of<Closeable>
  readonly trace: Of<Trace>
  readonly interruptAs: (id: FiberId) => Of<boolean>
}

export type AnyLiveFiber = Live<any, any> | Live<never, never> | Live<any, never> | Live<never, any>

export const Live = <E, A>(params: Omit<Live<E, A>, 'tag'>): Live<E, A> => ({
  tag: 'Live',
  ...params,
})

export interface Synthetic<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId.Synthetic
  readonly exit: Of<Exit<E, A>>
  readonly inheritFiberRefs: Of<void>
  readonly interruptAs: (id: FiberId) => Of<boolean>
}

export const Synthetic = <E, A>(params: Omit<Synthetic<E, A>, 'tag'>): Synthetic<E, A> => ({
  tag: 'Synthetic',
  ...params,
})

export const match =
  <E, A, B, C>(onLive: (live: Live<E, A>) => B, onSynthetic: (synthetic: Synthetic<E, A>) => C) =>
  (fiber: Fiber<E, A>) =>
    fiber.tag === 'Live' ? onLive(fiber) : onSynthetic(fiber)
