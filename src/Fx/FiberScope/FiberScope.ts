import { FiberId } from '../FiberId/FiberId.js'
import { AnyFiberRef, OutputOf } from '../FiberRef/FiberRef.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Closeable } from '../Scope/Closeable.js'

import { Scheduler } from '@/Fx/Scheduler/Scheduler.js'

export interface FiberScope extends Closeable {
  readonly fiberId: FiberId
  readonly fiberRefs: FiberRefs
  readonly scheduler: Scheduler
  readonly locally: <R extends AnyFiberRef>(ref: R, value: OutputOf<R>) => FiberScope
}

export function FiberScope(
  fiberId: FiberId,
  fiberRefs: FiberRefs,
  scheduler: Scheduler,
  scope: Closeable,
): FiberScope {
  const fiberScope: FiberScope = {
    fiberId,
    fiberRefs,
    scheduler,
    get state() {
      return scope.state
    },
    ensuring: scope.ensuring,
    fork: scope.fork,
    close: scope.close,
    locally: (ref, value) => FiberScope(fiberId, fiberRefs.locally(ref, value), scheduler, scope),
  }

  return fiberScope
}
