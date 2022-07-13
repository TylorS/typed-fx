import { FinalizationStrategy } from './Finalizer'
import { ReleaseMap } from './ReleaseMap'
import { Closeable } from './Scope'

import { Fx } from '@/Fx/Fx'
import { lazy } from '@/Fx/InstructionSet/FromLazy'
import { uninterruptable } from '@/Fx/InstructionSet/SetInterruptable'

export class LocalScope extends Closeable {
  protected releaseMap = new ReleaseMap()

  constructor(readonly strategy: FinalizationStrategy) {
    super(
      (f) => this.releaseMap.add(f),
      (s) =>
        lazy(() => {
          const { releaseMap } = this

          return uninterruptable(
            Fx(function* () {
              const scope = new LocalScope(s)
              const finalizer = yield* releaseMap.add(scope.close)

              yield* scope.addFinalizer(finalizer)

              return scope
            }),
          )
        }),
      (exit) => this.releaseMap.releaseAll(exit, this.strategy),
    )
  }
}
