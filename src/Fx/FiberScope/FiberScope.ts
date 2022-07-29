import { AnyFiberRef, OutputOf } from '../FiberRef/FiberRef.js'
import { FiberRefs } from '../FiberRefs/FiberRefs.js'
import { Closeable } from '../Scope/Closeable.js'

import { Scheduler } from '@/Fx/Scheduler/Scheduler.js'

export interface FiberScope extends Closeable {
  readonly fiberRefs: FiberRefs
  readonly scheduler: Scheduler
  readonly locally: <R extends AnyFiberRef>(ref: R, value: OutputOf<R>) => FiberScope
}

export function FiberScope(
  scope: Closeable,
  scheduler: Scheduler,
  fiberRefs: FiberRefs,
): FiberScope {
  const fiberScope: FiberScope = {
    fiberRefs,
    scheduler,
    get state() {
      return scope.state
    },
    ensuring: scope.ensuring,
    fork: scope.fork,
    close: scope.close,
    locally: (ref, value) => FiberScope(scope, scheduler, fiberRefs.locally(ref, value)),
  }

  return fiberScope
}
