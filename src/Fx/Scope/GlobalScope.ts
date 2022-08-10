import { constant } from 'hkt-ts'

import { Closeable } from './Closeable.js'
import { LocalScope } from './LocalScope.js'
import { Open } from './ScopeState.js'

import { FinalizationStrategy, SequentialStrategy } from '@/Fx/Finalizer/Finalizer.js'
import { success, unit } from '@/Fx/Fx/Fx.js'

export const GlobalScope: Closeable = {
  state: Open,
  ensuring: constant(constant(unit)),
  fork: (s: FinalizationStrategy = SequentialStrategy) => new LocalScope(s),
  close: constant(success(false)),
}
