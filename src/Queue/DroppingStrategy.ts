import { NonNegativeInteger } from 'hkt-ts/number'

import { QueueStrategy, disposeAllOnShutdown, runRemaining } from './QueueStrategy.js'

import * as Fx from '@/Fx/index.js'

/**
 * Creates a QueueStrategy which always favors the values currently in the Queue
 * and drops any that come in after capacity has been hit.
 */
export function makeDroppingStategy<A>(capacity: NonNegativeInteger): QueueStrategy<A> {
  return {
    capacity,
    offer: (offered, queue, offers) =>
      Fx.fromLazy(() => {
        const proposedSize = queue.length + offered.length
        const canHandleSurplus = proposedSize <= capacity

        if (canHandleSurplus) {
          queue.push(...offered)

          return true
        }

        // Drop any values that can not fit
        const toRemove = proposedSize - capacity
        const toKeep = offered.length - toRemove

        if (toKeep > 0) {
          const values = offered.slice(0, toKeep)

          runRemaining(values, offers)

          queue.push(...values)
        }

        return false
      }),
    onShutdown: disposeAllOnShutdown,
  }
}
