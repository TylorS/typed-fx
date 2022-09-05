import { Effect } from './Effect.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Disposable, None } from '@/Disposable/Disposable.js'

export interface Future<Fx extends Effect.AnyIO, E, A> {
  readonly state: Atomic<FutureState<Fx, E, A>>
  readonly __trace?: string
}

// TODO: Should Futures have a Trace?
export namespace Future {
  export function Pending<Fx extends Effect.AnyIO, E, A>(__trace?: string): Future<Fx, E, A> {
    return { state: Atomic<FutureState<Fx, E, A>>(FutureState.Pending()), __trace }
  }

  export function addObserver<Fx extends Effect.AnyIO, E, A>(
    future: Future<Fx, E, A>,
    observer: (result: Effect<Fx, E, A>) => void,
  ): Disposable {
    const state = future.state.get()

    if (state.tag === 'Done') {
      observer(state.result)

      return None
    }

    state.observers.push(observer)

    return Disposable(() => {
      const i = state.observers.indexOf(observer)

      if (i > -1) {
        state.observers.splice(i, 1)
      }
    })
  }

  export function complete<Fx extends Effect.AnyIO, E, A>(future: Future<Fx, E, A>) {
    return (result: Effect<Fx, E, A>): boolean => {
      const state = future.state.get()

      if (state.tag === 'Done') {
        return false
      }

      state.observers.forEach((observer) => observer(result))

      future.state.set(FutureState.Done(result))

      return true
    }
  }
}

export type FutureState<Fx extends Effect.AnyIO, E, A> =
  | FutureState.Pending<Fx, E, A>
  | FutureState.Done<Fx, E, A>

export namespace FutureState {
  export interface Pending<Fx extends Effect.AnyIO, E, A> {
    readonly tag: 'Pending'
    readonly observers: Array<(result: Effect<Fx, E, A>) => void>
  }

  export function Pending<Fx extends Effect.AnyIO, E, A>(): FutureState.Pending<Fx, E, A> {
    return { tag: 'Pending', observers: [] }
  }

  export interface Done<Fx extends Effect.AnyIO, E, A> {
    readonly tag: 'Done'
    readonly result: Effect<Fx, E, A>
  }

  export function Done<Fx extends Effect.AnyIO, E, A>(
    result: Effect<Fx, E, A>,
  ): FutureState.Done<Fx, E, A> {
    return { tag: 'Done', result }
  }
}
