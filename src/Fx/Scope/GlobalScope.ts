import { constant } from 'hkt-ts'
import { Nothing } from 'hkt-ts/Maybe'

import { Closeable } from './Closeable.js'
import { LocalScope } from './LocalScope.js'
import { Open } from './ScopeState.js'

import { FinalizationStrategy, SequentialStrategy } from '@/Fx/Finalizer/Finalizer.js'
import { success } from '@/Fx/Fx/Fx.js'

export const GlobalScope: Closeable = {
  state: Open([], new Map()),
  ensuring: () => Nothing,
  fork: (s: FinalizationStrategy = SequentialStrategy) => new LocalScope(s),
  close: constant(success(false)),
}
