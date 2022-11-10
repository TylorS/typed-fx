import { Effect } from '@effect/core/io/Effect'
import { Enqueue } from '@effect/core/io/Queue'

import { Fx } from './Fx.js'
import { runObserve } from './runObserve.js'

export function toEnqueue<A>(enqueue: Enqueue<A>): <R, E>(fx: Fx<R, E, A>) => Effect<R, E, void> {
  return runObserve(enqueue.offer)
}
