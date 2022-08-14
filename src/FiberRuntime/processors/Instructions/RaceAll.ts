import { Just, Nothing } from 'hkt-ts/Maybe'
import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'

import { getTraceUpTo } from './Failure.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberContext } from '@/FiberContext/index.js'
import { FiberId, Live } from '@/FiberId/FiberId.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { FxNode, InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Await, Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
// eslint-disable-next-line import/no-cycle
import { make } from '@/FiberRuntime/make.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { RaceAll } from '@/Fx/Instructions/RaceAll.js'
import { AnyFx, Fx, success } from '@/Fx/index.js'
import { Scope } from '@/Scope/Scope.js'
import { acquireFiber } from '@/Semaphore/Semaphore.js'

export function processRaceAll(id: FiberId, context: FiberContext, fiberScope: Scope) {
  return <FX extends NonEmptyArray<AnyFx>>(
    raceAll: RaceAll<FX>,
    state: FiberState,
    node: InstructionNode,
  ): RuntimeUpdate => {
    if (raceAll.input.length === 1) {
      return [new Running(new FxNode(raceAll.input[0], node)), state]
    }

    const trace = getTraceUpTo(state.trace, context.platform.maxTraceCount)
    const future = Pending<never, never, Exit<any, any>>()
    let deleted = 0
    const runtimes = raceAll.input.map((fx, i) => {
      const id = Live(context.platform)
      const scope = fiberScope.fork()
      const runtime: FiberRuntime<any, any> = make({
        fx: acquireFiber(state.concurrencyLevel.value)(fx),
        id,
        env: state.env.value,
        context: FiberContext.fork(context, { fiberRefs: context.fiberRefs }),
        scope,
        trace: trace.tag === 'EmptyTrace' ? Nothing : Just(trace),
      })

      runtime.addObserver((exit) => {
        runtimes.splice(i - deleted++, 1)
        complete(future)(success(exit))
      })

      return runtime
    })

    runtimes.forEach((f) => f.start())

    return [
      new Await(
        future,
        () =>
          Fx(function* () {
            for (const runtime of runtimes) {
              yield* runtime.interruptAs(id)
            }
          }),
        node,
      ),
      state,
    ]
  }
}
