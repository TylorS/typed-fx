import { Atomic } from '@/Atomic/Atomic.js'
import { Disposable } from '@/Disposable/Disposable.js'
import type { IO } from '@/IO/IO.js'

export interface IOFuture<E, A> {
  readonly state: Atomic<IOFutureState<E, A>>
}

export type IOFutureState<E, A> = PendingIO<E, A> | ResolvedIO<E, A>

export interface PendingIO<E, A> {
  readonly tag: 'Pending'
  readonly observers: ReadonlySet<Observer<E, A>>
}

export function PendingIO<E, A>(): IOFuture<E, A> {
  return {
    state: Atomic<IOFutureState<E, A>>({ tag: 'Pending', observers: new Set() }),
  }
}

export function addObserver<E, A>(future: IOFuture<E, A>, observer: Observer<E, A>): Disposable {
  return future.state.modify((state): readonly [Disposable, IOFutureState<E, A>] => {
    if (state.tag === 'Resolved') {
      observer(state.io)

      return [Disposable.None, state]
    }

    const updated: IOFutureState<E, A> = {
      ...state,
      observers: new Set([...state.observers, observer]),
    }

    return [Disposable(() => removeObserver(future, observer)), updated]
  })
}

function removeObserver<E, A>(future: IOFuture<E, A>, observer: Observer<E, A>) {
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

export interface Observer<E, A> {
  (io: IO<E, A>): void
}

export interface ResolvedIO<E, A> {
  readonly tag: 'Resolved'
  readonly io: IO<E, A>
}

export function Resolved<E, A>(io: IO<E, A>): IOFuture<E, A> {
  return {
    state: Atomic<IOFutureState<E, A>>({ tag: 'Resolved', io }),
  }
}

export function complete<E, A>(future: IOFuture<E, A>) {
  return (io: IO<E, A>) =>
    future.state.modify<boolean>((s) => {
      if (s.tag === 'Resolved') {
        return [false, s]
      }

      s.observers.forEach((o) => o(io))

      return [true, { tag: 'Resolved', io }]
    })
}
