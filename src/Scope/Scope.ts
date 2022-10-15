import type { Closeable } from './Closeable.js'
import { ScopeState } from './ScopeState.js'

import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Service } from '@/Service/Service.js'

export interface Scope {
  readonly state: ScopeState
  readonly ensuring: (finalizer: Finalizer) => Finalizer
  readonly fork: () => Closeable
}

export const Scope = Service<Scope>('Scope')
