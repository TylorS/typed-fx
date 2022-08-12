import { match } from 'hkt-ts/Either'

import { CauseError } from '@/Cause/CauseError.js'
import { Exit } from '@/Exit/Exit.js'
import { Live } from '@/Fiber/Fiber.js'
import { Fx, RIO } from '@/Fx/Fx.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { fiberRutimeFromSchedulerContext } from '@/Scheduler/RootScheduler.js'
import { SchedulerContext, getSchedulerContext } from '@/Scheduler/Scheduler.js'

export interface Runtime<R> {
  readonly runFiber: <E, A>(fx: Fx<R, E, A>, params?: ForkParams) => Live<E, A>
  readonly runExit: <E, A>(fx: Fx<R, E, A>, params?: ForkParams) => Promise<Exit<E, A>>
  readonly run: <E, A>(fx: Fx<R, E, A>, params?: ForkParams) => Promise<A>
}

export function Runtime<R = never>(context: SchedulerContext<R>): Runtime<R> {
  return {
    runFiber: <E, A>(fx: Fx<R, E, A>, params?: ForkParams) =>
      context.scheduler.asap(fx, SchedulerContext.fork(context, params)),
    runExit: <E, A>(fx: Fx<R, E, A>, params?: ForkParams): Promise<Exit<E, A>> =>
      new Promise((resolve) => {
        const runtime = fiberRutimeFromSchedulerContext(fx, SchedulerContext.fork(context, params))
        runtime.addObserver(resolve)
        runtime.start()
      }),
    run: <E, A>(fx: Fx<R, E, A>, params?: ForkParams): Promise<A> =>
      new Promise((resolve, reject) => {
        const runtime = fiberRutimeFromSchedulerContext(fx, SchedulerContext.fork(context, params))
        runtime.addObserver(
          match(
            // TODO: Pass along renderer from Fiber Context?
            (cause) => reject(new CauseError(cause)),
            resolve,
          ),
        )
        runtime.start()
      }),
  }
}

export function getCurrentRuntime<R>(): RIO<R, Runtime<R>> {
  return Fx(function* () {
    return Runtime<R>(yield* getSchedulerContext<R>())
  })
}
