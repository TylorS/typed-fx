import { Enqueue, Queue } from './Queue.js'

export function local<B, A>(
  f: (b: B) => A,
): {
  <R, E, R2, E2, C>(queue: Queue<R, E, A, R2, E2, C>): Queue<R, E, B, R2, E2, C>
  <R, E>(queue: Enqueue<R, E, A>): Enqueue<R, E, B>
}

export function local<B, A>(f: (b: B) => A) {
  return <R, E, R2, E2, C>(queue: Queue<R, E, A, R2, E2, C>): Queue<R, E, B, R2, E2, C> => {
    return {
      ...queue,
      enqueue: (...items) => queue.enqueue(...items.map(f)),
    }
  }
}
