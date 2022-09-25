import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberId } from '@/FiberId/index.js'
import { MutableFutureQueue } from '@/Future/MutableFutureQueue.js'
import * as Fx from '@/Fx/index.js'

export interface QueueStrategy<A> {
  readonly capacity: NonNegativeInteger

  readonly offer: (offered: ReadonlyArray<A>, queue: A[], offers: WaitFor<A>) => Fx.Of<boolean>

  readonly onShutdown: (
    queue: A[],
    fiberId: FiberId,
    offers: WaitFor<A>,
    takers: WaitFor<A>,
  ) => Fx.Of<void>
}

export type WaitFor<A> = MutableFutureQueue<never, never, A>

export const runRemaining = <A>(current: readonly A[], waitFor: WaitFor<A>) => {
  const remaining = Math.min(current.length, waitFor.size())

  // Let any suspended offerings resume
  for (let i = 0; i < remaining; ++i) {
    waitFor.next(Fx.now(current[i]))
  }

  return remaining
}

export const disposeAll =
  (id: FiberId) =>
  <A>(waitFor: WaitFor<A>) => {
    const size = waitFor.size()

    for (let i = 0; i < size; ++i) {
      waitFor.next(Fx.interrupted(id))
    }
  }

export const disposeAllOnShutdown: QueueStrategy<any>['onShutdown'] = (_, id, offers, takers) =>
  Fx.fromLazy(() => {
    disposeAll(id)(offers)
    disposeAll(id)(takers)
  })
