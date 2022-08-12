import { Future } from './Future.js'

import { Fx } from '@/Fx/Fx.js'

export function complete<R, E, A>(future: Future<R, E, A>) {
  return (fx: Fx<R, E, A>) =>
    future.state.modify<boolean>((s) => {
      if (s.tag === 'Resolved' || s.tag === 'Interrupted') {
        return [false, s]
      }

      s.observers.forEach((o) => o(fx))

      return [true, { tag: 'Resolved', fx }]
    })
}
