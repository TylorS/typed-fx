import { Clock } from './Clock'

import { Time, UnixTime } from '@/Time/index'

export function DateClock(startTime: Date = new Date()): Clock {
  const offset = startTime.getTime()

  return Clock(UnixTime(offset), () => Time(new Date().getTime() - offset))
}
