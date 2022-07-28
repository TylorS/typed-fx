import { Left, Right } from 'hkt-ts/Either'
import { getOrElse, isNothing } from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'

import { Scope } from './Scope.js'
import { ScopeState } from './ScopeState.js'

import { Empty } from '@/Fx/Cause/Cause.js'
import { Exit } from '@/Fx/Exit/Exit.js'
import { Of, fromLazy, lazy, success } from '@/Fx/Fx/Fx.js'
import { async } from '@/Fx/Fx/Instruction/Async.js'
import { Service } from '@/Service/index.js'

export interface Closeable extends Scope {
  readonly state: ScopeState // Should be a readonly-accessor (e.g. get state(): ScopeState)
  readonly close: (exit: Exit<any, any>) => Of<boolean> // Whether or not the scope has closed
}

export const Closeable = Service<Closeable>('Closeable')

export function wait(scope: Closeable) {
  return async<never, never, Exit<any, any>>((cb) => {
    const finalizer = scope.ensuring((exit) => fromLazy(() => cb(success(exit))))

    if (isNothing(finalizer)) {
      return Right(success(getExit(scope)))
    }

    return Left(lazy(() => finalizer.value(getExit(scope))))
  })
}

export function getExit(scope: Closeable) {
  return scope.state.tag === 'Open'
    ? pipe(
        scope.state.exit,
        getOrElse(() => Left(Empty)),
      )
    : scope.state.exit
}
