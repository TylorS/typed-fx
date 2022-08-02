import { Maybe } from 'hkt-ts/Maybe'

import type { Closeable } from './Closeable.js'

import { FinalizationStrategy, Finalizer } from '@/Fx/Finalizer/Finalizer.js'
import { Service } from '@/Service/index.js'

export interface Scope {
  readonly ensuring: (finalizer: Finalizer) => Maybe<Finalizer>
  readonly fork: (strategy?: FinalizationStrategy) => Closeable
}

export const Scope = Service<Scope>('Scope')
