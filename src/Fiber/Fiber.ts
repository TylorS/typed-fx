import { flow, pipe } from 'hkt-ts/function'

import type { Exit } from '@/Exit/Exit.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import type { FiberId } from '@/FiberId/FiberId.js'
import { join } from '@/FiberRefs/FiberRefs.js'
import type { FiberStatus } from '@/FiberStatus/index.js'
import { Of, flatMap, fork, fromExit, getFiberContext, map } from '@/Fx/Fx.js'
import type { Trace } from '@/Trace/Trace.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, never> | Fiber<any, never> | Fiber<never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ErrorsOf<T> = [T] extends [Fiber<infer E, infer _A>] ? E : never

export type OutputOf<T> = [T] extends [Fiber<infer _E, infer A>] ? A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId
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
  readonly id: FiberId
  readonly exit: Of<Exit<E, A>>
  readonly inheritFiberRefs: Of<void>
  readonly interruptAs: (id: FiberId) => Of<Exit<E, A>>
}

export const Synthetic = <E, A>(params: Omit<Synthetic<E, A>, 'tag'>): Synthetic<E, A> => ({
  tag: 'Synthetic',
  ...params,
})

export const match =
  <E, A, B, C>(onLive: (live: Live<E, A>) => B, onSynthetic: (synthetic: Synthetic<E, A>) => C) =>
  (fiber: Fiber<E, A>) =>
    fiber.tag === 'Live' ? onLive(fiber) : onSynthetic(fiber)

export const inheritFiberRefs = <E, A>(fiber: Fiber<E, A>): Of<void> =>
  pipe(
    fiber,
    match(
      (l) =>
        pipe(
          getFiberContext,
          map((c) => join(c.fiberRefs, l.context.fiberRefs)),
        ),
      (s) => s.inheritFiberRefs,
    ),
  )

export const interruptAs =
  (id: FiberId) =>
  <E, A>(fiber: Fiber<E, A>) =>
    fiber.interruptAs(id)

export const interruptAsFork = (id: FiberId) => flow(interruptAs(id), flatMap(fromExit), fork)

export const interrupt = <E, A>(fiber: Fiber<E, A>) =>
  pipe(
    getFiberContext,
    flatMap(({ id }) => interruptAs(id)(fiber)),
  )

export const interruptFork = <E, A>(fiber: Fiber<E, A>) =>
  pipe(
    getFiberContext,
    flatMap(({ id }) => interruptAsFork(id)(fiber)),
  )
