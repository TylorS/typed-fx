import { NonNegativeInteger } from 'hkt-ts/number'

import { QueueStrategy, disposeAllOnShutdown, runRemaining } from './QueueStrategy.js'

import * as Fx from '@/Fx/index.js'

/**
 * Makes a QueueStrategy which has no bounds besides memory of allocated to the process.
 */
export function makeUnboundedStategy<A>(): QueueStrategy<A> {
  return {
    capacity: NonNegativeInteger(Infinity),
    offer: (offered, queue, offers) =>
      Fx.fromLazy(() => {
        queue.push(...offered)

        runRemaining(offered, offers)

        return true
      }),
    onShutdown: disposeAllOnShutdown,
  }
}
