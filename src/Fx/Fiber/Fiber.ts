import type { Exit } from '../Exit/Exit.js'
import type { FiberContext } from '../FiberContext/FiberContext.js'
import type { FiberId } from '../FiberId/FiberId.js'
import type { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Fx, Of } from '../Fx/Fx.js'

import type { Closeable } from '@/Fx/Scope/Closeable.js'

export type Fiber<E, A> = Live<E, A> | Synthetic<E, A>

export type AnyFiber = Fiber<any, any> | Fiber<never, any>

export interface Live<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId
  readonly context: Of<FiberContext>
  readonly exit: Of<Exit<E, A>>
  readonly scope: Closeable
}

export const Live = <E, A>(
  id: FiberId,
  context: Of<FiberContext>,
  exit: Of<Exit<E, A>>,
  scope: Closeable,
): Live<E, A> => ({
  tag: 'Live',
  id,
  context,
  exit,
  scope,
})

export interface Synthetic<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId
  readonly exit: Of<Exit<E, A>>
  readonly inheritRefs: Of<void>
  readonly fiberRefs: FiberRefs
}

export const Synthetic = <E, A>(
  id: FiberId,
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

export function inheritRefs<E, A>(fiber: Fiber<E, A>) {
  if (fiber.tag === 'Synthetic') {
    return fiber.inheritRefs
  }

  return Fx(function* () {
    const context = yield* fiber.context

    yield* context.fiberRefs.inherit
  })
}
