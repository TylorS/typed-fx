import { FiberId } from '../FiberId/FiberId.js'
import { FinalizationStrategy } from '../Finalizer/Finalizer.js'

import { LocalScope } from '@/Fx/Scope/LocalScope.js'

export class FiberScope extends LocalScope {
  constructor(readonly fiberId: FiberId, readonly strategy: FinalizationStrategy) {
    super(strategy)
  }
}
