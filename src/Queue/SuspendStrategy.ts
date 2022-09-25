import { NonNegativeInteger } from 'hkt-ts/number'

import { QueueStrategy, disposeAllOnShutdown, runRemaining } from './QueueStrategy.js'

import { wait } from '@/Future/index.js'
import * as Fx from '@/Fx/index.js'

/**
 * Creates a QueueStrategy which when reaching capacity will wait for room in the Queue
 * before continuing to add them for processing.
 */
export function makeSuspendStrategy<A>(capacity: NonNegativeInteger): QueueStrategy<A> {
  return {
    capacity,
    offer: (offered, queue, offers) =>
      Fx.Fx(function* () {
        const proposedSize = queue.length + offered.length
        const canHandleSurplus = proposedSize <= capacity

        if (canHandleSurplus) {
          runRemaining(offered, offers)

          queue.push(...offered)

          return true
        }

        const toWaitOn = proposedSize - capacity
        const toPush = offered.length - toWaitOn
        const surplus = [...offered]

        if (toPush > 0) {
          const values = surplus.splice(0, toPush)

          runRemaining(values, offers)

          queue.push(...values)
        }

        // Wait for values to be dequeued before adding the the queue
        for (const future of offers.waitFor(surplus.length)) {
          yield* wait(future)

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          queue.push(surplus.shift()!)
        }

        return true
      }),
    onShutdown: disposeAllOnShutdown,
  }
}
