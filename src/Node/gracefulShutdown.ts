import process from 'node:process'

import { Atomic } from '@/Atomic/Atomic.js'
import * as Duration from '@/Duration/Duration.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { runMain, zipAll } from '@/Fx/index.js'
import { trackIn } from '@/Supervisor/trackIn.js'

const DELAY = Duration.toMilliseconds(Duration.Duration(1, Duration.Unit.Hour)).value

export function gracefulShutdown(
  fibers: Atomic<ReadonlyMap<FiberId.Live, AnyLiveFiber>> = Atomic<
    ReadonlyMap<FiberId.Live, AnyLiveFiber>
  >(new Map()),
) {
  // Used to forcefully keep the process (e.g. Node.js) alive even when fibers are idle.
  let id: ReturnType<typeof setTimeout> | undefined

  const gracefulExit = () =>
    void runMain(
      zipAll(Array.from(fibers.get().values()).map((fiber) => fiber.interruptAs(FiberId.None))),
    ).then(
      () => process.exit(0),
      () => process.exit(1),
    )

  return trackIn(fibers).extend({
    onStart: (parent) => (fiber, fx) => {
      parent(fiber, fx)

      if (!id) {
        // Force the process to stay alive, even when fibers are idle.
        id = setTimeout(() => {
          id = undefined
        }, DELAY)

        // Add a listener to the process to gracefully exit when the process is killed.
        process.addListener('SIGTERM', gracefulExit)
        process.addListener('SIGINT', gracefulExit)
      }
    },
    onEnd: (parent) => (fiber, exit) => {
      parent(fiber, exit)

      if (fibers.get().size === 0 && id) {
        clearTimeout(id)
        id = undefined
        process.removeListener('SIGTERM', gracefulExit)
        process.removeListener('SIGINT', gracefulExit)
      }
    },
  })
}
