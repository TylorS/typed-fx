import { Left, Right } from 'hkt-ts/Either'

import { Scope } from './Scope.js'

import { Exit } from '@/Exit/Exit.js'
import { Of, async, fromLazy, lazy, success } from '@/Fx/Fx.js'
import { Service } from '@/Service/index.js'

export interface Closeable extends Scope {
  readonly close: (exit: Exit<any, any>) => Of<boolean> // Whether or not the scope has closed
}

export const Closeable = Service<Closeable>('Closeable')

export function wait(scope: Closeable) {
  return async<never, never, Exit<any, any>>((cb) => {
    if (scope.state.tag !== 'Closed') {
      const finalizer = scope.ensuring((exit) => fromLazy(() => cb(success(exit))))

      return Left(lazy(() => finalizer(Right(undefined))))
    }

    return Right(success(scope.state.exit))
  })
}
