import { Future } from './Future'

import { Fx, Of } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/index'
import { Service } from '@/Service/Service'

export function complete<R extends Service<any>, E, A>(fx: Fx<R, E, A>) {
  return (future: Future<R, E, A>): Of<boolean> =>
    fromLazy(() => {
      const state = future.state.get

      switch (state.tag) {
        case 'Resolved':
          return false
        case 'Pending': {
          future.state.modify(() => [undefined, { tag: 'Resolved' as const, fx }])

          const observers = state.observers.get

          observers.forEach((f) => f(fx))

          state.observers.getAndSet(new Set())

          return true
        }
      }
    })
}
