import { Disposable } from '../Disposable/Disposable.js'
import { Task } from '../Future/Task.js'
import * as Fx from '../Fx/Fx.js'
import { fork } from '../Fx/Instruction/Fork.js'
import { Timeline } from '../Timeline/index.js'
import * as Timer from '../Timer/Timer.js'

import { Scheduler, make } from './Scheduler.js'

import * as Clock from '@/Clock/Clock.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { UnixTime } from '@/Time/index.js'

export function RootScheduler(timer: Timer.Timer): Scheduler {
  const timeline = new Timeline<Task<any, any, any>>(scheduleNextRun)

  let disposable: Disposable = Disposable.None
  let nextArrival: UnixTime | null = null

  const schedule: Scheduler['schedule'] = <R, E, A>(fx: Fx.Fx<R, E, A>, schedule: Schedule) =>
    fork(
      scheduled(fx, schedule, timer, (fx, time) => {
        const task = Task(fx)
        timeline.add(time, task)
        return task.wait
      }),
    )

  const scheduler: Scheduler = {
    startTime: timer.startTime,
    getCurrentTime: timer.getCurrentTime,
    schedule,
    fork: () => make(Clock.fork(timer), schedule),
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
