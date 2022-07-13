import type { FiberRuntime } from './FiberRuntime'

import { Exit } from '@/Exit/Exit'
import { Fiber } from '@/Fiber/Fiber'
import { pending } from '@/Future/Future'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { getFiberScope } from '@/Fx/InstructionSet/GetFiberScope'

export function fromFiberRuntime<R, E, A>(runtime: FiberRuntime<R, E, A>): Fiber<E, A> {
  const exit = pending<Exit<E, A>>()
  const fiber: Fiber<E, A> = {
    id: runtime.params.fiberId,
    scope: runtime.scope,
    // TODO: Implement stack traces
    stack: void 0 as any,
    exit: wait(exit),
    inheritFiberRefs: Fx(function* () {
      const scope = yield* getFiberScope

      yield* scope.fiberRefs.join(runtime.scope.fiberRefs)
    }),
  }

  return fiber
}
