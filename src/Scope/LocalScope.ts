import { ReleaseMap } from './ReleaseMap'
import { Closeable, FinalizationStrategy, Finalizer } from './Scope'

import { Exit } from '@/Exit/Exit'
import { Fx, Of } from '@/Fx/Fx'
import { lazy } from '@/Fx/InstructionSet/FromLazy'
import { uninterruptable } from '@/Fx/InstructionSet/SetInterruptable'

export class LocalScope extends Closeable {
  readonly releaseMap = new ReleaseMap()

  constructor(readonly strategy: FinalizationStrategy) {
    super()
  }

  readonly addFinalizer: (finalizer: Finalizer) => Of<Finalizer> = (f) => this.releaseMap.add(f)

  readonly close: (exit: Exit<any, any>) => Of<void> = (exit) =>
    this.releaseMap.releaseAll(exit, this.strategy)

  readonly forkWith: (strategy: FinalizationStrategy) => Of<Closeable> = (s) =>
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
    })
}
