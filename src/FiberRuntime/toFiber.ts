import { FiberRuntime } from './FiberRuntime.js'

import * as Fiber from '@/Fiber/Fiber.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import { fromLazy, success } from '@/Fx/Fx.js'
import { Closeable, wait } from '@/Scope/Closeable.js'

export function toFiber<E, A>(
  runtime: FiberRuntime<E, A>,
  context: FiberContext,
  scope: Closeable,
): Fiber.Live<E, A> {
  return Fiber.Live({
    id: runtime.id,
    status: fromLazy(runtime.status),
    context: success(context),
    scope: success(scope),
    exit: wait(scope),
    trace: fromLazy(runtime.trace),
    interruptAs: runtime.interruptAs,
  })
}
