import { Left, Right } from 'hkt-ts/Either'

import { Future } from './Future.js'

import { Fx, fromLazy } from '@/Fx/Fx/Fx.js'
import { async } from '@/Fx/Fx/Instruction/Async.js'

export function wait<R, E, A>(future: Future<R, E, A>): Fx<R, E, A> {
  return async<R, E, A>((cb) => {
    const state = future.state.get

    switch (state.tag) {
      case 'Resolved':
        return Right(state.fx)
      case 'Pending': {
        state.observers.update((s) => new Set([...s, cb]))

        return Left(removeObserver(future, cb))
      }
    }
  })
}

function removeObserver<R, E, A>(future: Future<R, E, A>, cb: (fx: Fx<R, E, A>) => void) {
  return fromLazy(() => {
    const state = future.state.get

    if (state.tag === 'Pending') {
      state.observers.update((s) => new Set([...s].filter((x) => x !== cb)))
    }
  })
}
