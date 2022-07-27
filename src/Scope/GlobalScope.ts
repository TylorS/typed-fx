import { Nothing } from 'hkt-ts/Maybe'

import { Closeable } from './Closeable.js'
import { LocalScope } from './LocalScope.js'
import { Open } from './ScopeState.js'

import { FinalizationStrategy, SequentialStrategy } from '@/Fx/Finalizer/Finalizer.js'
import { fromValue } from '@/Fx/Fx/Fx.js'

export class GlobalScope implements Closeable {
  readonly state = Open([], new Map())
  readonly ensuring = () => Nothing
  readonly fork = (s: FinalizationStrategy = SequentialStrategy) => new LocalScope(s)
  readonly close = () => fromValue(false)
}

export const globalScope = new GlobalScope()
