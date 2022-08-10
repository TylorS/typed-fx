import type { Closeable } from './Closeable.js'
import { ScopeState } from './ScopeState.js'

import { FinalizationStrategy, Finalizer } from '@/Finalizer/Finalizer.js'
import { Service } from '@/Service/index.js'

export interface Scope {
  readonly state: ScopeState
  readonly ensuring: (finalizer: Finalizer) => Finalizer
  readonly fork: (strategy?: FinalizationStrategy) => Closeable
}

export const Scope = Service<Scope>('Scope')
