import { Fiber, Synthetic } from './Fiber.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { now, unit } from '@/Fx/index.js'

export function fromExit<E, A>(exit: Exit<E, A>): Fiber<E, A> {
  return Synthetic({
    id: new FiberId.Synthetic([]),
    exit: now(exit),
    inheritFiberRefs: unit,
    interruptAs: () => now(exit),
  })
}
