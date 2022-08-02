import { pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Eff } from '../Eff.js'
import { Async, async } from '../Instructions/Async.js'

import { Future } from './Future.js'

import { update } from '@/Atomic/Atomic.js'

export function wait<Y, R>(future: Future<Y, R>): Eff<Y | Async<Y, R, never>, R> {
  return async<Y, R, never>((cb) => {
    const state = future.state.get()

    switch (state.tag) {
      case 'Resolved':
        return Right(state.eff)
      case 'Pending': {
        pipe(
          state.observers,
          update((s) => new Set([...s, cb])),
        )

        return Left(removeObserver(future, cb))
      }
    }
  })
}

function removeObserver<Y, R>(future: Future<Y, R>, cb: (eff: Eff<Y, R>) => void) {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    const state = future.state.get()

    if (state.tag === 'Pending') {
      pipe(
        state.observers,
        update((s) => new Set([...s].filter((x) => x !== cb))),
      )
    }
  })
}
