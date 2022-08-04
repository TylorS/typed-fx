import { Either } from 'hkt-ts'
import { Maybe } from 'hkt-ts/Maybe'

import { Env } from '../Env/Env.js'
import { Live } from '../Fiber/Fiber.js'
import { FiberRuntime, fromFiberRuntime } from '../Fiber/FiberRuntime.js'
import * as FiberContext from '../FiberContext/FiberContext.js'
import { ForkParams } from '../Fx/Instructions/Fork.js'
import { Fx } from '../Fx/index.js'
import { Scope } from '../Scope/Scope.js'

import { increment } from '@/Atomic/AtomicCounter.js'
import { CauseError } from '@/Cause/CauseError.js'
import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Trace } from '@/Trace/Trace.js'

export interface Runtime<R> {
  readonly run: <E, A>(fx: Fx<R, E, A>, forkParams?: ForkParams) => Promise<A>
  readonly runExit: <E, A>(fx: Fx<R, E, A>, forkParams?: ForkParams) => Promise<Exit<E, A>>
  readonly runFiber: <E, A>(fx: Fx<R, E, A>, forkParams?: ForkParams) => Live<E, A>
}

export type RuntimeParams<R> = {
  readonly env: Env<R>
  readonly context: FiberContext.FiberContext
  readonly scope: Scope
  readonly trace: Maybe<Trace>
}

export function Runtime<R = never>(params: RuntimeParams<R>): Runtime<R> {
  const platform = params.context.platform
  const makeFiberRuntime = <E, A>(fx: Fx<R, E, A>, forkParams?: ForkParams) =>
    new FiberRuntime(
      fx,
      params.env,
      FiberContext.fork(params.context, {
        ...forkParams,
        id:
          forkParams?.id ??
          new FiberId.Live(
            increment(platform.sequenceNumber),
            params.context.platform.timer,
            params.context.platform.timer.getCurrentTime(),
          ),
      }),
      forkParams?.forkScope?.fork() ?? params.scope.fork(),
      params.trace,
    )

  return {
    runFiber: (fx, p) => fromFiberRuntime(makeFiberRuntime(fx, p)),
    runExit: (fx, p) =>
      new Promise((resolve) => {
        const runtime = makeFiberRuntime(fx, p)
        runtime.addObserver(resolve)
        runtime.start()
      }),
    run: (fx, p) =>
      new Promise((resolve, reject) => {
        const runtime = makeFiberRuntime(fx, p)
        runtime.addObserver(Either.match((cause) => reject(new CauseError(cause)), resolve))
        runtime.start()
      }),
  }
}
