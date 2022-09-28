import { Fx } from './Fx.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Disposable, None } from '@/Disposable/Disposable.js'

export interface Future<R, E, A> {
  readonly state: Atomic<FutureState<R, E, A>>
}

export type FutureState<R, E, A> = FutureStatePending<R, E, A> | FutureStateDone<R, E, A>

export interface FutureStatePending<R, E, A> {
  readonly tag: 'Pending'
  readonly observers: Array<(fx: Fx<R, E, A>) => void>
}

export interface FutureStateDone<R, E, A> {
  readonly tag: 'Done'
  readonly fx: Fx<R, E, A>
}

export const FutureStatePending = <R, E, A>(
  observers: Array<(fx: Fx<R, E, A>) => void>,
): FutureStatePending<R, E, A> => ({
  tag: 'Pending',
  observers,
})

export const FutureStateDone = <R, E, A>(fx: Fx<R, E, A>): FutureStateDone<R, E, A> => ({
  tag: 'Done',
  fx,
})

export const Future = <R, E, A>(state: Atomic<FutureState<R, E, A>>): Future<R, E, A> => ({
  state,
})

export const Done = <R, E, A>(fx: Fx<R, E, A>): Future<R, E, A> =>
  Future(Atomic<FutureState<R, E, A>>(FutureStateDone(fx)))

export const Pending = <R, E, A>(
  observers: Array<(fx: Fx<R, E, A>) => void> = [],
): Future<R, E, A> => Future(Atomic<FutureState<R, E, A>>(FutureStatePending(observers)))

export function complete<R, E, A>(future: Future<R, E, A>): (fx: Fx<R, E, A>) => boolean {
  return (fx) => {
    const state = future.state.get()

    if (state.tag === 'Done') {
      return false
    }

    future.state.set(FutureStateDone(fx))

    for (const observer of state.observers) {
      observer(fx)
    }

    return true
  }
}

export function observe<R, E, A>(
  future: Future<R, E, A>,
): (f: (fx: Fx<R, E, A>) => void) => Disposable {
  return (f) => {
    const state = future.state.get()

    if (state.tag === 'Done') {
      f(state.fx)

      return None
    }

    state.observers.push(f)

    return Disposable(() => {
      const index = state.observers.indexOf(f)

      if (index !== -1) {
        state.observers.splice(index, 1)
      }
    })
  }
}
