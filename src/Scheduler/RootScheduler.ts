import { Scheduler } from './Scheduler.js'
import { callbackScheduler } from './callbackScheduler.js'
import { scheduled } from './scheduled.js'

import { increment } from '@/Atomic/AtomicCounter.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { make } from '@/FiberRuntime/make.js'
import { toFiber } from '@/FiberRuntime/toFiber.js'
import { Pending } from '@/Future/Future.js'
import { complete } from '@/Future/complete.js'
import { wait } from '@/Future/wait.js'
import { Fx } from '@/Fx/Fx.js'
import { Timer } from '@/Timer/Timer.js'

export function RootScheduler(timer: Timer): Scheduler {
  const [disposable, addTask] = callbackScheduler(timer)

  const schedule: Scheduler['schedule'] = (fx, schedule, context) => {
    const { env, scope, ...fiberContext } = context
    const runtime = make({
      fx: scheduled(fx, schedule, timer, (fx, time) => {
        const task = new ScheduledTask(fx)

        addTask(time, task.start)

        return task.wait
      }),
      env,
      scope,
      context: fiberContext,
      id: new FiberId.Live(
        increment(context.platform.sequenceNumber),
        context.platform.timer,
        context.platform.timer.getCurrentTime(),
      ),
    })

    // Okay to start synchronously, as it will suspend as soon as it reaches the ScheduleState.
    runtime.start()

    return toFiber(runtime)
  }

  const scheduler: Scheduler = {
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
