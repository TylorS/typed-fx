import { Disposable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import * as Fiber from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/index.js'
import { Fx, RIO, getEnv, getFiberContext, getFiberScope } from '@/Fx/index.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Closeable } from '@/Scope/Closeable.js'

/**
 * Scheduler is capable of converting Fx into a runnning Fiber given a particular Schedule.
 * It implements the Disposable interface, it will NOT interrupt running fibers, but WILL
 * clear all currently scheduled Fibers to start.
 */
export interface Scheduler extends Disposable {
  readonly schedule: <R, E, A>(
    fx: Fx<R, E, A>,
    schedule: Schedule,
    context: SchedulerContext<R>,
  ) => Fiber.Live<E, ScheduleState>
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
    const context: SchedulerContext<R> = {
      env: yield* getEnv<R>(),
      scope: yield* getFiberScope,
      ...(yield* getFiberContext),
    }

    return context
  })
}

export function forkSchedulerContext<R>() {
  return Fx(function* () {
    return SchedulerContext.fork(yield* getSchedulerContext<R>())
  })
}

export interface SchedulerContext<R> extends FiberContext {
  readonly env: Env<R>
  readonly scope: Closeable
}

export namespace SchedulerContext {
  export function fork<R>(context: SchedulerContext<R>) {
    return {
      ...FiberContext.fork(context),
      env: context.env,
      scope: context.scope.fork(),
    }
  }
}
