import { Future } from './Future.js'

import { interrupt } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { fromExit } from '@/Fx/index.js'

export function interruptAs<R, E, A>(future: Future<R, E, A>) {
  return (fiberId: FiberId) =>
    future.state.modify<boolean>((s) => {
      if (s.tag === 'Resolved' || s.tag === 'Interrupted') {
        return [false, s]
      }

      // Interrupt all the observers
      s.observers.forEach((o) => o(fromExit(interrupt(fiberId)) as any))

      return [true, { tag: 'Interrupted', fiberId }]
    })
}
