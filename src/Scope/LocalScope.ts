import { pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FinalizationStrategy } from './Finalizer'
import { ReleaseMap } from './ReleaseMap'
import { Closeable } from './Scope'

import { AtomicCounter } from '@/Atomic/AtomicCounter'
import { Exit } from '@/Exit/Exit'
import { Fx } from '@/Fx/Fx'
import { lazy } from '@/Fx/lazy'

export class LocalScope extends Closeable {
  protected releaseMap = new ReleaseMap()
  protected refCount = new AtomicCounter(NonNegativeInteger(0))

  constructor(readonly strategy: FinalizationStrategy) {
    super(
      (f) =>
        pipe(
          f,
          this.releaseMap.addIfOpen,
          Maybe.map((k) => (exit: Exit<any, any>) => this.releaseMap.release(k, exit)),
        ),
      (s) => {
        const { refCount } = this

        const scope = new LocalScope(s)
        const finalizer = this.addFinalizer(scope.close)

        if (Maybe.isNothing(finalizer)) {
          throw new Error(`Unable to fork a Scope which has been closed`)
        }

        refCount.increment
        scope.addFinalizer((exit) =>
          lazy(() => {
            refCount.decrement

            return finalizer.value(exit)
          }),
        )

        return scope
      },
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
