import { identity, pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Disposable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import * as Fiber from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/index.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import {
  Fx,
  Of,
  RIO,
  fromLazy,
  getEnv,
  getFiberContext,
  getFiberScope,
  getStackTrace,
  unit,
} from '@/Fx/Fx.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import * as Schedule from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'
import { EmptyTrace, StackTrace, Trace } from '@/Trace/Trace.js'

/**
 * Scheduler is capable of converting Fx into a runnning Fiber given a particular Schedule.
 * It implements the Disposable interface, it will NOT interrupt running fibers, but WILL
 * clear all currently scheduled tasks, including Fibers pending start.
 */
export interface Scheduler extends Disposable {
  readonly asap: <R, E, A>(fx: Fx<R, E, A>, context: SchedulerContext<R>) => Fiber.Live<E, A>

  readonly schedule: <R, E, A>(
    fx: Fx<R, E, A>,
    schedule: Schedule.Schedule,
    context: SchedulerContext<R>,
  ) => Fiber.Live<E, ScheduleState>
}

export function asap<R, E, A>(fx: Fx<R, E, A>): RIO<R, Fiber.Live<E, A>> {
  return Fx(function* () {
    const context = yield* forkSchedulerContext<R>()

    return context.scheduler.asap(fx, context)
  })
}

export function scheduled(schedule: Schedule.Schedule) {
  return <R, E, A>(fx: Fx<R, E, A>): RIO<R, Fiber.Live<E, ScheduleState>> =>
    Fx(function* () {
      const context = yield* forkSchedulerContext<R>()

      return context.scheduler.schedule(fx, schedule, context)
    })
}

export function scheduledWith<R>(schedule: Schedule.Schedule, context: SchedulerContext<R>) {
  return <E, A>(fx: Fx<R, E, A>): Fiber.Live<E, ScheduleState> =>
    context.scheduler.schedule(fx, schedule, context)
}

export function getSchedulerContext<R>() {
  return Fx(function* () {
    const scope = yield* getFiberScope
    const env = yield* getEnv<R>()
    const trace = yield* getStackTrace
    const fiberContext = yield* getFiberContext
    const context: SchedulerContext<R> = {
      env,
      scope,
      trace,
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
  readonly trace: StackTrace
  readonly transform: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>
}

export namespace SchedulerContext {
  export function fork<R>(context: SchedulerContext<R>, params?: ForkParams): SchedulerContext<R> {
    return {
      ...FiberContext.fork(context, params),
      env: context.env,
      trace: params?.trace ?? new Stack<Trace>(EmptyTrace),
      scope: context.scope.fork(),
      transform: context.transform,
    }
  }
}

export function delayed(delay: Delay) {
  return <R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> =>
    Fx(function* () {
      const task = Pending<R, E, A>()

      // Allow the Scheduler to determine when to continue.
      yield* pipe(
        fromLazy(() => complete(task)(fx)),
        scheduled(Schedule.delayed(delay).and(Schedule.once)),
      )

      return yield* wait(task)
    })
}

export function sleep(ms: NonNegativeInteger | Delay): Of<void> {
  return delayed(Delay(ms))(unit)
}
