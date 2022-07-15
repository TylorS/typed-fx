import { Scope } from './Scope'

import { Exit } from '@/Exit/Exit'
import * as Future from '@/Future/index'
import { Fx, Of } from '@/Fx/Fx'
import { success } from '@/Fx/index'
import { fromLazy } from '@/Fx/lazy'

export function wait<E, A>(scope: Scope): Of<Exit<E, A>> {
  return Fx(function* () {
    const future = Future.pending<Exit<E, A>, never>()

    yield* scope.addFinalizer((exit) => fromLazy(() => Future.complete(success(exit))(future)))

    return yield* Future.wait(future)
  })
}
