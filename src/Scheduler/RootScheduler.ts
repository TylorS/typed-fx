import { Scheduler } from './Scheduler.js'
import { callbackScheduler } from './callbackScheduler.js'
import { runSchedule } from './runSchedule.js'

import { delayToUnixTime } from '@/Clock/index.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import { Live } from '@/Fiber/index.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import * as FiberId from '@/FiberId/index.js'
import { CurrentEnv } from '@/FiberRef/builtins.js'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import { Fx } from '@/Fx/Fx.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Delay } from '@/Time/index.js'
import { SetTimeoutTimer } from '@/Timer/SetTimeoutTimer.js'
import { Timer } from '@/Timer/Timer.js'

export function RootScheduler(timer: Timer = SetTimeoutTimer()): Scheduler {
  return new RootSchedulerImpl(timer)
}

class RootSchedulerImpl implements Scheduler {
  readonly dispose: Disposable['dispose']

  protected readonly runAt: <R, E, A>(fx: Fx<R, E, A>, delay: Delay) => Fx<R, E, A>

  constructor(readonly timer: Timer) {
    const [disposable, addTask] = callbackScheduler(timer)

    this.dispose = disposable.dispose

    this.runAt = <R, E, A>(fx: Fx<R, E, A>, delay: Delay): Fx<R, E, A> => {
      const task = new ScheduledTask(fx)

      addTask(delayToUnixTime(delay)(this.timer), task.start)

      return task.wait
    }
  }

  readonly asap: Scheduler['asap'] = <R, E, A>(
    fx: Fx<R, E, A>,
    env: Env<R>,
    context: FiberContext<FiberId.Live>,
  ): Live<E, A> => {
    context.fiberRefs.locals.set(CurrentEnv, env)

    const runtime = new FiberRuntime(this.runAt(fx, Delay(0)), context)

    // Safe to call sync since it will be run by the Timeline.
    runtime.startSync()

    return runtime
  }

  readonly schedule: Scheduler['schedule'] = <R, E, A, B>(
    fx: Fx<R, E, A>,
    env: Env<R>,
    schedule: Schedule,
    context: FiberContext<FiberId.Live>,
    onEnd?: (state: ScheduleState) => Fx<R, E, B>,
  ) => {
    context.fiberRefs.locals.set(CurrentEnv, env)

    const runtime = new FiberRuntime(
      runSchedule(fx, schedule, this.timer, this.runAt, onEnd),
      context,
    )

    // Safe to call sync since it will be run by the Timeline.
    runtime.startSync()

    return runtime
  }
}

class ScheduledTask<R, E, A> {
  readonly future = Pending<R, E, A>()

  constructor(readonly fx: Fx<R, E, A>) {}

  readonly wait = wait(this.future)
  readonly start = () => complete(this.future)(this.fx)
}
