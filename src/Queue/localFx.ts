import { Queue } from './Queue.js'

import { Fx, zipAll } from '@/Fx/Fx.js'

export function localFx<B, R3, E3, A>(f: (b: B) => Fx<R3, E3, A>) {
  return <R, E, R2, E2, C>(
    queue: Queue<R, E, A, R2, E2, C>,
  ): Queue<R | R3, E | E3, B, R2, E2, C> => {
    return {
      ...queue,
      enqueue: (...items) =>
        Fx(function* () {
          const values = yield* zipAll(items.map(f))

          return yield* queue.enqueue(...values)
        }),
    }
  }
}
