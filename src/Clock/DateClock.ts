import { Clock, make } from './Clock.js'

import { Time, UnixTime } from '@/Time/index.js'

export function DateClock(startTime: Date = new Date()): Clock {
  const offset = startTime.getTime()

  return make(UnixTime(offset), () => Time(new Date().getTime() - offset))
}
