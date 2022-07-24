import { Clock } from './Clock'

import { Time } from '@/Time/index'

export function DateClock(startTime: Date = new Date()): Clock {
  const offset = startTime.getTime()

  return Clock(startTime, () => Time(new Date().getTime() - offset))
}
