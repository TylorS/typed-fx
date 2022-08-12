import { flow } from 'hkt-ts'

import { FiberRuntime } from './FiberRuntime.js'

import { Exit } from '@/Exit/Exit.js'
import * as Fiber from '@/Fiber/Fiber.js'
import type { FiberContext } from '@/FiberContext/FiberContext.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import { fromLazy, success } from '@/Fx/Fx.js'
import { Closeable } from '@/Scope/Closeable.js'

export function toFiber<E, A>(
  runtime: FiberRuntime<E, A>,
  context: FiberContext,
  scope: Closeable,
): Fiber.Live<E, A> {
  const future = Pending<never, never, Exit<E, A>>()

  runtime.addObserver(flow(success, complete(future)))

  return Fiber.Live({
    id: runtime.id,
    status: fromLazy(runtime.status),
    context: success(context),
    scope: success(scope),
    exit: wait(future),
    trace: fromLazy(runtime.trace),
    interruptAs: runtime.interruptAs,
  })
}
