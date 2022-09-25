import { Dequeue, Queue } from './Queue.js'

import { Fx } from '@/Fx/index.js'

export function forEach<B, R3, E3, C>(
  f: (b: B) => Fx<R3, E3, C>,
): {
  <R2, E2>(queue: Dequeue<R2, E2, B>): Fx<R2 | R3, E2 | E3, readonly C[]>
  <R, E, A, R2, E2>(queue: Queue<R, E, A, R2, E2, B>): Fx<R2 | R3, E2 | E3, readonly C[]>
}

export function forEach<B, R3, E3, C>(f: (b: B) => Fx<R3, E3, C>) {
  return <R2, E2>(queue: Dequeue<R2, E2, B>): Fx<R2 | R3, E2 | E3, readonly C[]> =>
    Fx(function* () {
      const values: C[] = []

      while (!(yield* queue.isShutdown)) {
        values.push(yield* f(yield* queue.dequeue))
      }

      return values
    })
}

export function forEachVoid<B, R3, E3, C>(
  f: (b: B) => Fx<R3, E3, C>,
): {
  <R2, E2>(queue: Dequeue<R2, E2, B>): Fx<R2 | R3, E2 | E3, void>
  <R, E, A, R2, E2>(queue: Queue<R, E, A, R2, E2, B>): Fx<R2 | R3, E2 | E3, void>
}

export function forEachVoid<B, R3, E3, C>(f: (b: B) => Fx<R3, E3, C>) {
  return <R2, E2>(queue: Dequeue<R2, E2, B>): Fx<R2 | R3, E2 | E3, void> =>
    Fx(function* () {
      while (!(yield* queue.isShutdown)) {
        yield* f(yield* queue.dequeue)
      }
    })
}
