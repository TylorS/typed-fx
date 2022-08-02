import { pipe } from 'hkt-ts/function'

import { Future, Resolved } from './Future.js'

import { getAndSet } from '@/Atomic/Atomic.js'
import { Eff } from '@/Eff/Eff.js'

export function complete<Y, R>(future: Future<Y, R>) {
  return (eff: Eff<Y, R>): boolean =>
    future.state.modify((s) => {
      if (s.tag === 'Resolved') {
        return [false, s]
      }

      // Clear Observers and return the Eff
      pipe(s.observers, getAndSet(new Set<any>())).forEach((f) => f(eff))

      return [true, new Resolved(eff)]
    })
}
