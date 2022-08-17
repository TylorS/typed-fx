import { Atomic } from '@/Atomic/Atomic.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { Fx } from '@/Fx/Fx.js'

export interface Future<R, E, A> {
  readonly state: Atomic<FutureState<R, E, A>>
}

export type AnyFuture =
  | Future<any, any, any>
  | Future<never, never, any>
  | Future<never, any, any>
  | Future<any, never, any>

export type FutureState<R, E, A> = Pending<R, E, A> | Resolved<R, E, A>

export interface Pending<R, E, A> {
  readonly tag: 'Pending'
  readonly observers: ReadonlySet<Observer<R, E, A>>
}

export function Pending<R, E, A>(): Future<R, E, A> {
  return {
    state: Atomic<FutureState<R, E, A>>({ tag: 'Pending', observers: new Set() }),
  }
}

export function addObserver<R, E, A>(
  future: Future<R, E, A>,
  observer: Observer<R, E, A>,
): Disposable {
  return future.state.modify((state): readonly [Disposable, FutureState<R, E, A>] => {
    if (state.tag === 'Resolved') {
      return [Disposable.None, state]
    }

    const updated: FutureState<R, E, A> = {
      ...state,
      observers: new Set([...state.observers, observer]),
    }

    return [Disposable(() => removeObserver(future, observer)), updated]
  })
}

function removeObserver<R, E, A>(future: Future<R, E, A>, observer: Observer<R, E, A>) {
  return future.state.modify((state) => {
    if (state.tag === 'Resolved') {
      return [undefined, state]
    }

    return [
      undefined,
      { ...state, observer: new Set([...state.observers].filter((x) => x !== observer)) },
    ]
  })
}

export interface Observer<R, E, A> {
  (fx: Fx<R, E, A>): void
}

export interface Resolved<R, E, A> {
  readonly tag: 'Resolved'
  readonly fx: Fx<R, E, A>
}

export function Resolved<R, E, A>(fx: Fx<R, E, A>): Future<R, E, A> {
  return {
    state: Atomic<FutureState<R, E, A>>({ tag: 'Resolved', fx }),
  }
}
