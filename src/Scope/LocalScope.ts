import { NonNegativeInteger } from 'hkt-ts/number'

import { FinalizationStrategy } from './Finalizer'
import { ReleaseMap } from './ReleaseMap'
import { Closeable } from './Scope'

import { AtomicCounter } from '@/Atomic/AtomicCounter'
import { Fx } from '@/Fx/Fx'
import { uninterruptable } from '@/Fx/InstructionSet/SetInterruptable'
import { lazy } from '@/Fx/lazy'

export class LocalScope extends Closeable {
  protected releaseMap = new ReleaseMap()
  protected refCount = new AtomicCounter(NonNegativeInteger(0))

  constructor(readonly strategy: FinalizationStrategy) {
    super(
      (f) => this.releaseMap.add(f),
      (s) =>
        lazy(() => {
          const { releaseMap, refCount } = this

          return uninterruptable(
            Fx(function* () {
              const scope = new LocalScope(s)
              const finalizer = yield* releaseMap.add(scope.close)

              refCount.increment

              yield* scope.addFinalizer((exit) =>
                lazy(() => {
                  refCount.decrement

                  return finalizer(exit)
                }),
              )

              return scope
            }),
          )
        }),
      (exit) =>
        lazy(() => {
          const { refCount } = this
          const releaseAll = this.releaseMap.releaseAll(exit, this.strategy)

          return Fx(function* () {
            if (refCount.decrement === 0) {
              yield* releaseAll

              return true
            }

            return false
          })
        }),
    )
  }
}
