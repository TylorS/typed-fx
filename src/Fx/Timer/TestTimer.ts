import { flow } from 'hkt-ts'

import { Timeline } from '../Timeline/index.js'

import { Timer } from './Timer.js'

import * as Clock from '@/Clock/Clock.js'
import { TestClock } from '@/Clock/TestClock.js'
import { Time } from '@/Time/index.js'

/**
 * A Timer which provides imperative access to progressing Time forward.
 */
export interface TestTimer extends Timer, TestClock {}

export function TestTimer(clock: TestClock = TestClock()): TestTimer {
  const timeline = new Timeline<() => void>()
  const runReadyTimers = (t: Time) => (
    timeline.getReadyTasks(Clock.timeToUnixTime(t)(clock)).forEach((f) => f()), t
  )

  return {
    startTime: clock.startTime,
    getCurrentTime: clock.getCurrentTime,
    setTimer: (f, delay) => {
      return timeline.add(Clock.delayToUnixTime(delay)(clock), f)
    },
    progressTimeBy: flow(clock.progressTimeBy, runReadyTimers),
    progressTimeTo: flow(clock.progressTimeTo, runReadyTimers),
  }
}
