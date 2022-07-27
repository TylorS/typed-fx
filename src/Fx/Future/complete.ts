import { Future, Resolved } from './Future.js'

import { Fx } from '@/Fx/Fx/Fx.js'

export function complete<R, E, A>(future: Future<R, E, A>) {
  return (fx: Fx<R, E, A>): boolean =>
    future.state.modify((s) => {
      if (s.tag === 'Resolved') {
        return [false, s]
      }

      // Clear Observers and return the Fx
      s.observers.getAndSet(new Set()).forEach((f) => f(fx))

      return [true, new Resolved(fx)]
    })
}
