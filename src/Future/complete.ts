import { Future } from './Future'

import { Fx } from '@/Fx/Fx'

export function complete<R, E, A>(fx: Fx<R, E, A>) {
  return (future: Future<R, E, A>): boolean => {
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
  }
}
