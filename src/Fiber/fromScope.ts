import { pipe } from 'hkt-ts'

import { Synthetic } from './Fiber.js'

import { interrupt } from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as FiberRefs from '@/FiberRefs/index.js'
import * as Fx from '@/Fx/index.js'
import { Closeable, closeOrWait, wait } from '@/Scope/Closeable.js'

export function fromScope(id: FiberId, fiberRefs: FiberRefs.FiberRefs, scope: Closeable) {
  return Synthetic({
    id,
    exit: wait(scope),
    inheritFiberRefs: pipe(
      Fx.getFiberRefs,
      Fx.flatMap((refs) => Fx.fromLazy(() => FiberRefs.join(refs, fiberRefs))),
    ),
    interruptAs: (id) => closeOrWait(scope)(interrupt(id)),
  })
}
