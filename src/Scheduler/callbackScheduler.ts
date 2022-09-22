import * as Clock from '@/Clock/Clock.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { UnixTime } from '@/Time/index.js'
import * as Timeline from '@/Timeline/index.js'
import { Timer } from '@/Timer/Timer.js'

export function callbackScheduler(
  timer: Timer,
): readonly [Disposable, (time: UnixTime, f: () => void) => Disposable] {
  const timeline = Timeline.Timeline<() => void>(scheduleNextRun)
  let disposable: Disposable = Disposable.None
  let nextArrival: UnixTime | null = null

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
    nextArrival = null
    timeline.getReadyTasks(Clock.timeToUnixTime(timer.getCurrentTime())(timer)).forEach((f) => f())

    scheduleNextRun()
  }

  return [Disposable(() => disposable.dispose()), timeline.add] as const
}
