import { Supervisor } from './Supervisor'
import { keepAlive } from './keepAlive'

import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { Fx } from '@/Fx/Fx'

/**
 * Creates a Supervisor intended for usage with the your Root Fibers, intended to keep the process alive while
 * while fibers are still executing.
 */
export function withKeepAlive(
  supervisor: Supervisor<ReadonlySet<FiberRuntime<any, any, any>>>,
): Supervisor<ReadonlySet<FiberRuntime<any, any, any>>> {
  const [ping, clear] = keepAlive()

  return new Supervisor(
    supervisor.value,
    (...args) =>
      Fx(function* () {
        ping()

        return yield* supervisor.onStart(...args)
      }),
    (...args) =>
      Fx(function* () {
        const x = yield* supervisor.onEnd(...args)
        const fibers = yield* supervisor.value

        if (fibers.size === 0) {
          clear()
        }

        return x
      }),
    supervisor.onInstruction,
    supervisor.onSuspend,
    supervisor.onRunning,
  )
}
