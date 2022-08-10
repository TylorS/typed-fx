import { Either, Left, Right } from 'hkt-ts/Either'

import { Future, addObserver } from './Future.js'

import { Fx, async, fromLazy } from '@/Fx/Fx.js'

export function wait<R, E, A>(future: Future<R, E, A>): Fx<R, E, A> {
  return async((cb) =>
    future.state.modify<Either<Fx<R, never, any>, Fx<R, E, A>>>((state) => {
      if (state.tag === 'Resolved') {
        return [Right(state.fx), state]
      }

      // Modifys the State
      const disposable = addObserver(future, cb)

      return [Left(fromLazy(() => disposable.dispose())), future.state.get()]
    }),
  )
}
