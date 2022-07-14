import type { FiberRuntime } from './FiberRuntime'

import { Fiber } from '@/Fiber/Fiber'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'

export function fromFiberRuntime<R, E, A>(runtime: FiberRuntime<R, E, A>): Fiber<E, A> {
  const fiber: Fiber<E, A> = {
    id: runtime.params.fiberId,
    scope: runtime.scope,
    stack: runtime.stackTrace,
    exit: wait(runtime.exit),
    inheritFiberRefs: Fx(function* () {
      const { scope } = yield* getFiberContext

      yield* scope.fiberRefs.join(runtime.scope.fiberRefs)
    }),
    interrupt: runtime.interrupt,
  }

  return fiber
}
