import { Future, Resolved } from './Future.js'

import { Eff } from '@/Eff/Eff.js'

export function complete<Y, R>(future: Future<Y, R>) {
  return (eff: Eff<Y, R>): boolean =>
    future.state.modify((s) => {
      if (s.tag === 'Resolved') {
        return [false, s]
      }

      // Clear Observers and return the Eff
      s.observers.getAndSet(new Set()).forEach((f) => f(eff))

      return [true, new Resolved(eff)]
    })
}
