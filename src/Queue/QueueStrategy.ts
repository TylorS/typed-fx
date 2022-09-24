import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberId } from '@/FiberId/index.js'
import { MutableFutureQueue } from '@/Future/MutableFutureQueue.js'
import { Of, now } from '@/Fx/index.js'

export interface QueueStrategy<A> {
  readonly capacity: NonNegativeInteger

  readonly offer: (offered: ReadonlyArray<A>, queue: A[], offers: WaitFor<A>) => Of<boolean>

  readonly onShutdown: (
    queue: A[],
    fiberId: FiberId,
    offers: WaitFor<A>,
    takers: WaitFor<A>,
  ) => Of<void>
}

export type WaitFor<A> = MutableFutureQueue<never, never, A>

export const runRemaining = <A>(current: readonly A[], waitFor: WaitFor<A>) => {
  const remaining = Math.min(current.length, waitFor.size())

  // Let any suspended offerings resume
  for (let i = 0; i < remaining; ++i) {
    waitFor.next(now(current[i]))
  }

  return remaining
}
