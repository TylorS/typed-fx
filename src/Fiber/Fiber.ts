import type { Exit } from '@/Exit/Exit.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import type { FiberId } from '@/FiberId/FiberId.js'
// eslint-disable-next-line import/no-cycle
import { join } from '@/FiberRefs/FiberRefs.js'
import type { FiberStatus } from '@/FiberStatus/index.js'
import { Fx, Of, fromLazy, getFiberContext } from '@/Fx/Fx.js'
import type { Trace } from '@/Trace/Trace.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, never> | Fiber<any, never> | Fiber<never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ErrorsOf<T> = [T] extends [Fiber<infer E, infer _A>] ? E : never

export type OutputOf<T> = [T] extends [Fiber<infer _E, infer A>] ? A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly context: FiberContext
  readonly status: Of<FiberStatus>
  readonly exit: Of<Exit<E, A>>
  readonly trace: Of<Trace>
  readonly interruptAs: (id: FiberId) => Of<Exit<E, A>>
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

export const inheritFiberRefs = <E, A>(fiber: Fiber<E, A>) =>
  Fx(function* () {
    if (fiber.tag === 'Synthetic') {
      return yield* fiber.inheritFiberRefs
    }

    const { fiberRefs } = yield* getFiberContext

    yield* fromLazy(() => join(fiberRefs, fiber.context.fiberRefs))
  })
