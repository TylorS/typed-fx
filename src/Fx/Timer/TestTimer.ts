import { TestClock } from '@/Clock/TestClock.js'
import { Time } from '@/Time/index.js'
import { Timeline } from '../Timeline/index.js'
import { Timer } from './Timer.js'

/**
 * A Timer which provides imperative access to progressing Time forward.
 */
export interface TestTimer extends Timer, TestClock {}

export function TestTimer(clock: TestClock = TestClock()): TestTimer {
  const timeline = new Timeline<() => void>()

  function runReadyTimers(time: Time) {
    timeline.getReadyTasks(time).forEach((f) => f())
  }

  return {
    startTime: clock.startTime,
    getCurrentTime: clock.getCurrentTime,
    setTimer: (f, delay) => {
      return timeline.add(Time(clock.getCurrentTime() + delay), f)
    },
    progressTimeBy: (delay) => {
      const t = clock.progressTimeBy(delay)

      runReadyTimers(t)

      return t
    },
    progressTimeTo: (time) => {
      const t = clock.progressTimeTo(time)

      runReadyTimers(t)

      return t
    },
  }
}
