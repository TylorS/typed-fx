import * as M from 'hkt-ts/Maybe'
import { flow, pipe } from 'hkt-ts/function'

import { Dequeue, Queue } from './Queue.js'

import { Fx, Of, flatMap, map, now, zipAll } from '@/Fx/Fx.js'

export function mapFx<A, R3, E3, B>(f: (a: A) => Fx<R3, E3, B>) {
  function mapFxQueue<R, E>(queue: Dequeue<R, E, A>): Dequeue<R | R3, E | E3, B>
  function mapFxQueue<R, E, I, R2, E2>(
    queue: Queue<R, E, I, R2, E2, A>,
  ): Queue<R, E, I, R2 | R3, E2 | E3, B>
  function mapFxQueue<R, E>(queue: Dequeue<R, E, A>): Dequeue<R | R3, E | E3, B> {
    return {
      ...queue,
      poll: pipe(
        queue.poll,
        flatMap(M.match((): Of<M.Maybe<B>> => now(M.Nothing), flow(f, map(M.Just)))),
      ),
      dequeue: pipe(queue.dequeue, flatMap(f)),
      dequeueAll: pipe(
        queue.dequeueAll,
        flatMap((as) => zipAll(as.map(f))),
      ),
      dequeueUpTo: flow(
        queue.dequeueUpTo,
        flatMap((as) => zipAll(as.map(f))),
      ),
    }
  }

  return mapFxQueue
}
