import { pipe } from 'hkt-ts/function'

import { Future, pending } from './Future.js'
import { complete } from './complete.js'

import { FiberId } from '@/Fx/FiberId/FiberId.js'
import { Fx, interrupted } from '@/Fx/Fx/Fx.js'

/**
 * A Future Queue is a synchronously-used, mutable, Queue for managing Futures that need to be handled in FIFO ordering.
 */
export interface MutableFutureQueue<R, E, A> {
  readonly size: () => number
  readonly next: (value: Fx<R, E, A>) => boolean
  readonly waitFor: (amount: number) => ReadonlyArray<Future<R, E, A>>
  readonly dispose: (fiberId: FiberId) => boolean
}

/**
 * Constructs a FutureQueue
 */
export function MutableFutureQueue<R, E, A>(): MutableFutureQueue<R, E, A> {
  const queue: Array<Future<R, E, A>> = []

  function next(fx: Fx<R, E, A>): boolean {
    if (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return pipe(fx, complete(queue.shift()!))
    }

    return false
  }

  function waitFor(amount: number): ReadonlyArray<Future<R, E, A>> {
    const pendingFutures = Array.from({ length: amount }, () => pending<A, R, E>())

    queue.push(...pendingFutures)

    return pendingFutures
  }

  function dispose(fiberId: FiberId): boolean {
    if (queue.length > 0) {
      queue.forEach((f) => complete(f)(interrupted(fiberId)))
      queue.splice(0, queue.length) // Clear the Queue

      return true
    }

    return false
  }

  return {
    size: () => queue.length,
    next,
    waitFor,
    dispose,
  } as const
}

export function toAll<R, E, A>(fx: Fx<R, E, A>) {
  return (queue: MutableFutureQueue<R, E, A>) => {
    while (queue.size() > 0) {
      queue.next(fx)
    }
  }
}
