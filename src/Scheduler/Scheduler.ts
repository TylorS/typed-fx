import { Maybe, identity } from 'hkt-ts'

import { Disposable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import * as Fiber from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/index.js'
import { Fx, RIO, getEnv, getFiberContext, getFiberScope, getTrace } from '@/Fx/Fx.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Trace } from '@/Trace/Trace.js'

/**
 * Scheduler is capable of converting Fx into a runnning Fiber given a particular Schedule.
 * It implements the Disposable interface, it will NOT interrupt running fibers, but WILL
 * clear all currently scheduled Fibers to start.
 */
export interface Scheduler extends Disposable {
  readonly asap: <R, E, A>(fx: Fx<R, E, A>, context: SchedulerContext<R>) => Fiber.Live<E, A>

  readonly schedule: <R, E, A>(
    fx: Fx<R, E, A>,
    schedule: Schedule,
    context: SchedulerContext<R>,
  ) => Fiber.Live<E, ScheduleState>
}

export function asap<R, E, A>(fx: Fx<R, E, A>): RIO<R, Fiber.Live<E, A>> {
  return Fx(function* () {
    const context = yield* forkSchedulerContext<R>()

    return context.scheduler.asap(fx, context)
  })
}

export function schedule(schedule: Schedule) {
  return <R, E, A>(fx: Fx<R, E, A>): RIO<R, Fiber.Live<E, ScheduleState>> =>
    Fx(function* () {
      const context = yield* forkSchedulerContext<R>()

      return context.scheduler.schedule(fx, schedule, context)
    })
}

export function scheduleWith<R>(schedule: Schedule, context: SchedulerContext<R>) {
  return <E, A>(fx: Fx<R, E, A>): Fiber.Live<E, ScheduleState> =>
    context.scheduler.schedule(fx, schedule, context)
}

export function getSchedulerContext<R>() {
  return Fx(function* () {
    const scope = yield* getFiberScope
    const env = yield* getEnv<R>()
    const trace = yield* getTrace
    const fiberContext = yield* getFiberContext
    const context: SchedulerContext<R> = {
      env,
      scope,
      trace: Maybe.Just(trace),
      transform: identity,
      ...fiberContext,
    }

    return context
  })
}

export function forkSchedulerContext<R>(params?: ForkParams) {
  return Fx(function* () {
    return SchedulerContext.fork(yield* getSchedulerContext<R>(), params)
  })
}

export interface SchedulerContext<R> extends FiberContext {
  readonly env: Env<R>
  readonly scope: Closeable
  readonly trace: Maybe.Maybe<Trace>
  readonly transform: <E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
}

export namespace SchedulerContext {
  export function fork<R>(context: SchedulerContext<R>, params?: ForkParams): SchedulerContext<R> {
    return {
      ...FiberContext.fork(context, params),
      env: context.env,
      trace: Maybe.fromNullable(params?.trace),
      scope: context.scope.fork(),
      transform: context.transform,
    }
  }
}
