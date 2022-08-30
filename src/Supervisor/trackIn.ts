import { pipe } from 'hkt-ts/function'

import { Supervisor } from './Supervisor.js'

import { Atomic, update } from '@/Atomic/Atomic.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { fromLazy } from '@/Fx/Fx.js'

export function trackIn(
  fibers: Atomic<ReadonlyMap<FiberId.Live, AnyLiveFiber>> = Atomic<
    ReadonlyMap<FiberId.Live, AnyLiveFiber>
  >(new Map()),
): Supervisor<ReadonlyMap<FiberId.Live, AnyLiveFiber>> {
  return new Supervisor(
    fromLazy(() => fibers.get()),
    (fiber) => {
      pipe(
        fibers,
        update((fibers) => new Map([...fibers, [fiber.id, fiber]])),
      )
    },
    (fiber) => {
      pipe(
        fibers,
        update(
          (fibers) =>
            new Map([...fibers].filter(([id]) => id.sequenceNumber !== fiber.id.sequenceNumber)),
        ),
      )
    },
  )
}
