import { flow } from 'hkt-ts'

import { Timer } from './Timer.js'

import * as Clock from '@/Clock/Clock.js'
import { TestClock } from '@/Clock/TestClock.js'
import { None } from '@/Disposable/Disposable.js'
import { Time } from '@/Time/index.js'
import { Timeline } from '@/Timeline/index.js'

/**
 * A Timer which provides imperative access to progressing Time forward.
 */
export interface TestTimer extends Timer, TestClock {}

export function TestTimer(clock: TestClock = TestClock(), autoRun = true): TestTimer {
  const timeline = Timeline<(t: Time) => void>()
  const runReadyTimers = (t: Time) => (
    timeline.getReadyTasks(Clock.timeToUnixTime(t)(clock)).forEach((f) => f(t)), t
  )

  return {
    startTime: clock.startTime,
    getCurrentTime: clock.getCurrentTime,
    setTimer: (f, delay) => {
      // If auto-run is enabled an delay is 0,
      // synchronously run the callback.
      if (autoRun && delay === 0) {
        f(clock.getCurrentTime())

        return None
      }

      return timeline.add(Clock.delayToUnixTime(delay)(clock), f)
    },
    progressTimeBy: flow(clock.progressTimeBy, runReadyTimers),
    progressTimeTo: flow(clock.progressTimeTo, runReadyTimers),
  }
}
