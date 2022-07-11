import type { FiberId } from '@/FiberId/FiberId'
import type { FiberRefs } from '@/FiberRefs/FiberRefs'
import * as Scope from '@/Scope/Scope'

export class FiberScope extends Scope.Scope {
  constructor(
    readonly fiberId: FiberId,
    readonly scope: Scope.Scope,
    readonly fiberRefs: FiberRefs,
  ) {
    super()
  }

  forkWith = this.scope.forkWith
  addFinalizer = this.scope.addFinalizer
}
