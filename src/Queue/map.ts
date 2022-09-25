import * as O from 'hkt-ts/Maybe'
import { flow, pipe } from 'hkt-ts/function'

import { Dequeue, Queue } from './Queue.js'

import * as Fx from '@/Fx/Fx.js'

export function map<A, B>(
  f: (a: A) => B,
): {
  <R, E>(queue: Dequeue<R, E, A>): Dequeue<R, E, B>
  <R, E, I, R2, E2>(queue: Queue<R, E, I, R2, E2, A>): Queue<R, E, I, R2, E2, B>
}

export function map<A, B>(f: (a: A) => B) {
  return <R, E>(queue: Dequeue<R, E, A>): Dequeue<R, E, B> => {
    return {
      ...queue,
      poll: pipe(queue.poll, Fx.map(O.map(f))),
      dequeue: pipe(queue.dequeue, Fx.map(f)),
      dequeueAll: pipe(
        queue.dequeueAll,
        Fx.map((as) => as.map(f)),
      ),
      dequeueUpTo: flow(
        queue.dequeueUpTo,
        Fx.map((as) => as.map(f)),
      ),
    }
  }
}
