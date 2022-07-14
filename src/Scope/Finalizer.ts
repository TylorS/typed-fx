import { NonNegativeInteger } from 'hkt-ts/number'

import type { Exit } from '@/Exit/Exit'
import { Of } from '@/Fx/Fx'

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
