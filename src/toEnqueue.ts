import { Effect, Queue } from 'effect'

import { Fx } from './Fx.js'
import { runObserve } from './runObserve.js'

export function toEnqueue<A>(
  enqueue: Queue.Enqueue<A>,
): <R, E>(fx: Fx<R, E, A>) => Effect.Effect<R, E, void> {
  return runObserve(enqueue.offer)
}
