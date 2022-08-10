import type { Scheduler } from './Scheduler.js'

import * as Clock from '@/Clock/Clock.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { Pending, complete, wait } from '@/Future/index.js'
import * as Fx from '@/Fx/Fx.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { UnixTime } from '@/Time/index.js'
import * as Timeline from '@/Timeline/index.js'
import * as Timer from '@/Timer/index.js'
import { SetTimeoutTimer } from '@/Timer/index.js'

export function RootScheduler(timer: Timer.Timer = SetTimeoutTimer()): Scheduler {
  const timeline = Timeline.make<Task<any, any, any>>(scheduleNextRun)

  let disposable: Disposable = Disposable.None
  let nextArrival: UnixTime | null = null

  const schedule: Scheduler['schedule'] = <R, E, A>(
    fx: Fx.Fx<R, E, A>,
    schedule: Schedule,
    params?: ForkParams,
  ) =>
    Fx.forkWithParams(params)(
      scheduled(fx, schedule, timer, (fx, time) => {
        const task = new Task(fx)
        timeline.add(time, task)
        return task.wait
      }),
    )

  const scheduler: Scheduler = {
    startTime: timer.startTime,
    getCurrentTime: timer.getCurrentTime,
    schedule,
  }

  function scheduleNextRun() {
    // If the timeline is empty, lets cleanup our resources
    if (timeline.isEmpty()) {
      disposable.dispose()
      nextArrival = null

      return
    }

    // Get the time of the next arrival currently in the Timeline
    const next = timeline.nextArrival()
    const needToScheduleEarlierTime = !nextArrival || nextArrival > next

    // If we need to create or schedule an earlier time, cleanup the old timer
    // and schedule the new one.
    if (needToScheduleEarlierTime) {
      disposable.dispose()
      disposable = timer.setTimer(runReadyTasks, Clock.unixTimeToDelay(next)(timer))
      nextArrival = next
    }
  }

  function runReadyTasks() {
    timeline
      .getReadyTasks(Clock.timeToUnixTime(timer.getCurrentTime())(timer))
      .forEach((f) => f.complete())

    scheduleNextRun()
  }

  return scheduler
}

function scheduled<R, E, A>(
  fx: Fx.Fx<R, E, A>,
  schedule: Schedule,
  clock: Clock.Clock,
  runAt: (fx: Fx.Fx<R, E, A>, time: UnixTime) => Fx.Fx<R, E, A>,
) {
  return Fx.Fx(function* () {
    let [state, decision] = schedule.step(clock.getCurrentTime(), new ScheduleState())

    while (decision.tag === 'Continue') {
      // Schedule a Task to run the next iteration of this Fx
      yield* runAt(fx, Clock.delayToUnixTime(decision.delay)(clock))

      // Calculate if we should continue or not
      const [nextState, nextDecision] = schedule.step(clock.getCurrentTime(), state)
      state = nextState
      decision = nextDecision
    }

    // Return the final state
    return state
  })
}

// A simple helper to create a Future around an existing Fx to be run
// at a future time by the scheduler.
class Task<R, E, A> {
  protected future = Pending<R, E, A>()

  constructor(readonly fx: Fx.Fx<R, E, A>) {}

  readonly wait = wait(this.future)
  readonly complete: () => boolean = () => complete(this.future)(this.fx)
}
