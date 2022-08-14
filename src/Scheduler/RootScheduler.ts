import { Scheduler, SchedulerContext } from './Scheduler.js'
import { callbackScheduler } from './callbackScheduler.js'
import { scheduled } from './scheduled.js'

import { timeToUnixTime } from '@/Clock/Clock.js'
import { Live } from '@/FiberId/FiberId.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { make } from '@/FiberRuntime/make.js'
import { toFiber } from '@/FiberRuntime/toFiber.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import { Fx } from '@/Fx/Fx.js'
import { UnixTime } from '@/Time/index.js'
import { Timer } from '@/Timer/Timer.js'

export function RootScheduler(timer: Timer): Scheduler {
  const [disposable, addTask] = callbackScheduler(timer)

  const runAt = <R, E, A>(fx: Fx<R, E, A>, time: UnixTime) => {
    const task = new ScheduledTask(fx)

    addTask(time, task.start)

    return task.wait
  }

  const asap: Scheduler['asap'] = (fx, schedulerContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { env, scope, trace, transform, ...context } = schedulerContext
    const runtime = fiberRutimeFromSchedulerContext(
      runAt(fx, timeToUnixTime(timer.getCurrentTime())(timer)),
      schedulerContext,
    )
    runtime.start()

    return toFiber(runtime, context, scope)
  }

  const schedule: Scheduler['schedule'] = (fx, schedule, schedulerContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { env, scope, trace, transform, ...context } = schedulerContext
    const runtime = fiberRutimeFromSchedulerContext(
      scheduled(fx, schedule, timer, runAt),
      schedulerContext,
    )
    runtime.start()

    return toFiber(runtime, context, scope)
  }

  const scheduler: Scheduler = {
    asap,
    schedule,
    ...disposable,
  }

  return scheduler
}

class ScheduledTask<R, E, A> {
  protected future = Pending<R, E, A>()

  constructor(readonly fx: Fx<R, E, A>) {}

  readonly wait = wait(this.future)
  readonly start = () => complete(this.future)(this.fx)
}

export function fiberRutimeFromSchedulerContext<R, E, A>(
  fx: Fx<R, E, A>,
  schedulerContext: SchedulerContext<R>,
): FiberRuntime<E, A> {
  const { env, scope, trace, transform, ...context } = schedulerContext

  return make({
    fx: transform(fx),
    id: Live(context.platform),
    context,
    env,
    scope,
    trace,
  })
}
