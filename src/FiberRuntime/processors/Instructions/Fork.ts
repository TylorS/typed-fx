import { Just } from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'

import { getTraceUpTo } from './Failure.js'

import { set } from '@/Atomic/Atomic.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { Fork } from '@/Fx/Instructions/Fork.js'
import { Scope } from '@/Scope/Scope.js'

export function processFork(initial: FiberContext, fiberScope: Scope) {
  return <R, E, A>(
    fork: Fork<R, E, A>,
    state: FiberState,
    node: InstructionNode,
  ): RuntimeUpdate => {
    const current: FiberContext = {
      ...initial,
      concurrencyLevel: state.concurrencyLevel.value.maxPermits,
      interruptStatus: state.interruptStatus.value,
    }
    const [fx, params] = fork.input
    const fiber = current.scheduler.asap(fx, {
      ...FiberContext.fork(current, params),
      env: state.env.value,
      scope: params.scope ?? params.forkScope?.fork() ?? fiberScope.fork(),
      trace: Just(getTraceUpTo(state.trace, current.platform.maxTraceCount)),
    })

    pipe(node.previous.next, set(fiber))

    return [new Running(node.previous), state]
  }
}
