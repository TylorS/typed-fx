import { NonNegativeInteger } from 'hkt-ts/number'

import { QueueStrategy, disposeAllOnShutdown, runRemaining } from './QueueStrategy.js'

import * as Fx from '@/Fx/index.js'

/**
 * Creates a QueueStrategy which always favors the offered values
 * and drops the oldest values in the Queue to stay at capacity.
 */
export function makeSlidingStategy<A>(capacity: NonNegativeInteger): QueueStrategy<A> {
  return {
    capacity,
    offer: (offered, queue, offers) =>
      Fx.fromLazy(() => {
        const size = queue.length
        const proposedSize = size + offered.length
        const canHandleSurplus = proposedSize <= capacity

        // Remove any additional
        if (queue.length > 0 && !canHandleSurplus) {
          queue.splice(0, proposedSize - capacity)
        }

        const values = offered.slice(capacity - queue.length, offered.length)

        runRemaining(values, offers)

        queue.push(...values)

        return offered.length <= capacity
      }),
    onShutdown: disposeAllOnShutdown,
  }
}
