import { pipe } from 'hkt-ts'

import { Synthetic } from './Fiber.js'

import { FiberId } from '@/FiberId/FiberId.js'
import { Closeable, closeOrWait, wait } from '@/Scope/Closeable.js'
import { Exit, FiberRefs, Fx } from '@/index.js'

export function fromScope(id: FiberId, fiberRefs: FiberRefs.FiberRefs, scope: Closeable) {
  return Synthetic({
    id,
    exit: wait(scope),
    inheritFiberRefs: pipe(
      Fx.getFiberRefs,
      Fx.flatMap((refs) => Fx.fromLazy(() => FiberRefs.join(refs, fiberRefs))),
    ),
    interruptAs: (id) => closeOrWait(scope)(Exit.interrupt(id)),
  })
}
