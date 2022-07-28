import { Clock } from './Clock.js'

import { Time, UnixTime } from '@/Time/index.js'

export function DateClock(startTime: Date = new Date()): Clock {
  const offset = startTime.getTime()

  return Clock(UnixTime(offset), () => Time(new Date().getTime() - offset))
}
