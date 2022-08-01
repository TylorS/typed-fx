import { pipe } from 'hkt-ts/function'

import { Eff } from '../Eff.js'

import { Future, pending } from './Future.js'
import { complete } from './complete.js'

/**
 * A Future Queue is a synchronously-used, mutable, Queue for managing Futures that need to be handled in FIFO ordering.
 */
export interface MutableFutureQueue<Y, R> {
  readonly size: () => number
  readonly next: (value: Eff<Y, R>) => boolean
  readonly all: (value: Eff<Y, R>) => boolean
  readonly waitFor: (amount: number) => ReadonlyArray<Future<Y, R>>
}

/**
 * Constructs a FutureQueue
 */
export function MutableFutureQueue<Y, R>(): MutableFutureQueue<Y, R> {
  const queue: Array<Future<Y, R>> = []

  function next(eff: Eff<Y, R>): boolean {
    if (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return pipe(eff, complete(queue.shift()!))
    }

    return false
  }

  function waitFor(amount: number): ReadonlyArray<Future<Y, R>> {
    const pendingFutures = Array.from({ length: amount }, () => pending<Y, R>())

    queue.push(...pendingFutures)

    return pendingFutures
  }

  function all(eff: Eff<Y, R>): boolean {
    if (queue.length > 0) {
      queue.forEach((f) => complete(f)(eff))
      queue.splice(0, queue.length) // Clear the Queue

      return true
    }

    return false
  }

  return {
    size: () => queue.length,
    next,
    waitFor,
    all,
  } as const
}
