import { Clock, make } from './Clock.js'

import { Delay, Time, UnixTime } from '@/Time/index.js'

/**
 * A Clock which provides imperative access to progressing Time forward.
 */
export interface TestClock extends Clock {
  readonly progressTimeBy: (delay: Delay) => Time
  readonly progressTimeTo: (delay: Time) => Time
}

export function TestClock(startTime: UnixTime = Date.now()): TestClock {
  let time: Time = Time(0)

  return {
    ...make(startTime, () => time),
    progressTimeBy: (delay: Delay) => {
      return (time = Time(time + delay))
    },
    progressTimeTo: (to: Time) => {
      return (time = to)
    },
  }
}
