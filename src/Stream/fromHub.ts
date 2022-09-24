import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'
import { flatMap } from './flatMap.js'
import { fromFx } from './fromFx.js'
import { fromQueue } from './fromQueue.js'
import { tapEnd } from './tapEnd.js'

import { Hub } from '@/Hub/Hub.js'
import { Scope } from '@/Scope/Scope.js'

export function fromHub<R, E, I, R2, E2, O>(
  hub: Hub<R, E, I, R2, E2, O>,
  __trace?: string,
): Stream<R2 | Scope, E | E2, O> {
  return pipe(
    fromFx(hub.subscribe),
    flatMap((dequeue) => pipe(fromQueue(dequeue), tapEnd(dequeue.shutdown)), __trace),
  )
}
