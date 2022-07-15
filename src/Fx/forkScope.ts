import { Fx } from './Fx'
import { fork } from './InstructionSet/Fork'

import { Fiber } from '@/Fiber/Fiber'
import { FinalizationStrategy, SequentialStrategy } from '@/Scope/Finalizer'
import { LocalScope } from '@/Scope/LocalScope'
import { Scope } from '@/Scope/Scope'
import { track } from '@/Supervisor/track'

export const forkScope =
  (scope: Scope, strategy: FinalizationStrategy = SequentialStrategy) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R, never, Fiber<E, A>> =>
    Fx(function* () {
      return yield* fork(fx, { scope: yield* scope.forkWith(strategy) })
    })

export const forkDaemon = <R, E, A>(fx: Fx<R, E, A>): Fx<R, never, Fiber<E, A>> =>
  Fx(function* () {
    return yield* fork(fx, { supervisor: track(), scope: new LocalScope(SequentialStrategy) })
  })
