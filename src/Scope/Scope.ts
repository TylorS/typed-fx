import type { Exit } from '@/Exit/Exit'
import type { Of } from '@/Fx/Fx'

// TODO: Create as a Service?
export abstract class Scope {
  abstract readonly addFinalizer: (finalizer: Finalizer) => Of<Finalizer>
  abstract readonly forkWith: (strategy: FinalizationStrategy) => Of<Closeable>

  readonly ensuring = (fx: Of<any>) => this.addFinalizer(() => fx)
  readonly fork = () => this.forkWith(SequentialStrategy)
}

export abstract class Closeable extends Scope {
  abstract readonly close: (exit: Exit<any, any>) => Of<void>
}

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
  readonly concurrency: number
}

export const ConcurrentNStrategy = (concurency: number): ConcurrentNStrategy => ({
  strategy: 'ConcurrentN',
  concurrency: concurency,
})
