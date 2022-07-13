import type { FiberId } from '@/FiberId/FiberId'
import type { FiberRefs } from '@/FiberRefs/FiberRefs'
import * as Scope from '@/Scope/Scope'

export class FiberScope extends Scope.Closeable {
  constructor(
    readonly fiberId: FiberId,
    readonly scope: Scope.Closeable,
    readonly fiberRefs: FiberRefs,
  ) {
    super(scope.addFinalizer, scope.forkWith, scope.close)
  }
}
