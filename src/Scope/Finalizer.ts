import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { finalizationStrategyToConcurrency } from './finalizeStrategyToConcurrency'

import type { Exit } from '@/Exit/Exit'
import { Of } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/InstructionSet/FromLazy'
import { withConcurrency } from '@/Fx/InstructionSet/WithConcurrency'
import { tuple } from '@/Fx/tuple'

export interface Finalizer {
  (exit: Exit<any, any>): Of<any>
}

export type FinalizationStrategy = SequentialStrategy | ConcurrentStrategy | ConcurrentNStrategy

export const SequentialStrategy = {
  strategy: 'Sequential',
} as const
export type SequentialStrategy = typeof SequentialStrategy

export const ConcurrentStrategy = {
  strategy: 'Concurrent',
} as const
export type ConcurrentStrategy = typeof ConcurrentStrategy

export interface ConcurrentNStrategy {
  readonly strategy: 'ConcurrentN'
  readonly concurrency: NonNegativeInteger
}

export const ConcurrentNStrategy = (concurency: NonNegativeInteger): ConcurrentNStrategy => ({
  strategy: 'ConcurrentN',
  concurrency: concurency,
})

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Finalizer {
  export const settable = (strategy: FinalizationStrategy = SequentialStrategy) => {
    const finalizers = new Set<Finalizer>()

    const addFinalizer = (finalizer: Finalizer): Finalizer => {
      finalizers.add(finalizer)

      return () => fromLazy(() => finalizers.delete(finalizer))
    }

    const finalizer: Finalizer = (exit) =>
      pipe(
        tuple(...Array.from(finalizers.values()).map((f) => f(exit))),
        withConcurrency(finalizationStrategyToConcurrency(strategy)),
      )

    return [finalizer, addFinalizer] as const
  }
}
