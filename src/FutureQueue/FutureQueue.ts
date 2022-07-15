import { pipe } from 'hkt-ts/function'

import { FiberId } from '@/FiberId/FiberId'
import { Future, pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { Fx } from '@/Fx/Fx'
import { interrupt } from '@/Fx/index'

/**
 * A Future Queue is a synchronously-used, mutable, Queue for managing Futures that need to be handled in FIFO ordering.
 */
export interface FutureQueue<R, E, A> {
  readonly size: () => number
  readonly next: (value: Fx<R, E, A>) => void
  readonly waitFor: (amount: number) => ReadonlyArray<Future<R, E, A>>
  readonly dispose: (fiberId: FiberId) => void
}

/**
 * Constructs a FutureQueue
 */
export function make<R, E, A>(): FutureQueue<R, E, A> {
  const queue: Array<Future<R, E, A>> = []

  function next(fx: Fx<R, E, A>): boolean {
    if (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return pipe(queue.shift()!, complete(fx))
    }

    return false
  }

  function waitFor(amount: number): ReadonlyArray<Future<R, E, A>> {
    const pendingFutures = Array.from({ length: amount }, () => pending<A, R, E>())

    queue.push(...pendingFutures)

    return pendingFutures
  }

  function dispose(fiberId: FiberId) {
    if (queue.length > 0) {
      queue.forEach(complete<R, E, A>(interrupt(fiberId)))
      queue.splice(0, queue.length) // Clear the Queue
    }
  }

  return {
    size: () => queue.length,
    next,
    waitFor,
    dispose,
  } as const
}

export function toAll<R, E, A>(fx: Fx<R, E, A>) {
  return (queue: FutureQueue<R, E, A>) => {
    while (queue.size() > 0) {
      queue.next(fx)
    }
  }
}
