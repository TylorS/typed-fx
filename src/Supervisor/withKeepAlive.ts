import { Supervisor } from './Supervisor'
import { keepAlive } from './keepAlive'

import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'

/**
 * Creates a Supervisor intended for usage with the your Root Fibers, intended to keep the process alive while
 * while fibers are still executing.
 */
export function withKeepAlive(
  supervisor: Supervisor<ReadonlySet<FiberRuntime<any, any, any>>>,
): Supervisor<ReadonlySet<FiberRuntime<any, any, any>>> {
  const [ping, clear] = keepAlive()

  return new Supervisor(
    supervisor.atomic,
    (...args) => {
      supervisor.onStart(...args)

      if (supervisor.atomic.get.size === 0) {
        ping()
      }
    },
    (...args) => {
      supervisor.onEnd(...args)

      if (supervisor.atomic.get.size === 0) {
        clear()
      }
    },
    supervisor.onInstruction,
    supervisor.onSuspend,
    supervisor.onRunning,
  )
}
