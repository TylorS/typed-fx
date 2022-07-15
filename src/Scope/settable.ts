import { pipe } from 'hkt-ts'

import { FinalizationStrategy, Finalizer, SequentialStrategy } from './Finalizer'
import { finalizationStrategyToConcurrency } from './finalizeStrategyToConcurrency'

import { zipAll } from '@/Fx/InstructionSet/ZipAll'
import { withConcurrency } from '@/Fx/index'
import { fromLazy } from '@/Fx/lazy'

export const settable = (strategy: FinalizationStrategy = SequentialStrategy) => {
  const finalizers = new Set<Finalizer>()

  const addFinalizer = (finalizer: Finalizer): Finalizer => {
    finalizers.add(finalizer)

    return () => fromLazy(() => finalizers.delete(finalizer))
  }

  const finalizer: Finalizer = (exit) =>
    pipe(
      zipAll(...Array.from(finalizers.values()).map((f) => f(exit))),
      withConcurrency(finalizationStrategyToConcurrency(strategy)),
    )

  return [finalizer, addFinalizer] as const
}
