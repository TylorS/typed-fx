import { Supervisor } from './Supervisor'
import { keepAlive } from './keepAlive'

import { Fx } from '@/Fx/index'

/**
 * Creates a Supervisor intended for usage with the your Root Fibers, intended to keep the process alive while
 * while fibers are still executing.
 */
export function withKeepAlive(supervisor: Supervisor): Supervisor {
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
