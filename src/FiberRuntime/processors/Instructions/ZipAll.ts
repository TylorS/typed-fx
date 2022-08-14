import { Either, pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { isLeft } from 'hkt-ts/Either'
import { Just, Nothing } from 'hkt-ts/Maybe'

import { getTraceUpTo } from './Failure.js'

import { set } from '@/Atomic/Atomic.js'
import { Exit, makeParallelAssociative } from '@/Exit/Exit.js'
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
import { ZipAll } from '@/Fx/Instructions/ZipAll.js'
import { AnyFx, Fx, success } from '@/Fx/index.js'
import { Scope } from '@/Scope/Scope.js'
import { acquireFiber } from '@/Semaphore/Semaphore.js'

export function processZipAll(id: FiberId, context: FiberContext, fiberScope: Scope) {
  return <FX extends ReadonlyArray<AnyFx>>(
    zipAll: ZipAll<FX>,
    state: FiberState,
    node: InstructionNode,
  ): RuntimeUpdate => {
    if (zipAll.input.length === 0) {
      pipe(node.previous.next, set([]))

      return [new Running(node.previous), state]
    }

    if (zipAll.input.length === 1) {
      return [
        new Running(
          new FxNode(
            Fx(function* () {
              return [yield* zipAll.input[0]]
            }),
            node,
          ),
        ),
        state,
      ]
    }

    const trace = getTraceUpTo(state.trace, context.platform.maxTraceCount)
    const [future, onExit] = zipAllFuture(zipAll.input.length)

    const deleted = 0
    const runtimes = zipAll.input.map((fx, i) => {
      const id = Live(context.platform)
      const scope = fiberScope.fork()
      const runtime: FiberRuntime<any, any> = make({
        fx: acquireFiber(state.concurrencyLevel.value)(fx),
        id,
        env: state.env.value,
        context: FiberContext.fork(context),
        scope,
        trace: trace.tag === 'EmptyTrace' ? Nothing : Just(trace),
      })

      runtime.addObserver((exit) => {
        onExit(exit, i)
        runtimes.splice(i - deleted, 1)
      })

      return runtime
    })

    runtimes.forEach((r) => r.start())

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

const { concat: concatPar } = makeParallelAssociative(makeAssociative<any>())

function zipAllFuture<E, A>(length: number) {
  const future = Pending<never, never, Exit<E, A>>()
  const exits = Array(length)

  let remaining = length

  return [
    future,
    (exit: Exit<E, any>, index: number) => {
      exits[index] = Either.tupled(exit)

      if (isLeft(exit)) {
        return complete(future)(success(exit))
      }

      if (--remaining === 0) {
        return complete(future)(success(exits.reduce(concatPar)))
      }
    },
  ] as const
}
