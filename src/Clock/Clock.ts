import { Lazy } from 'hkt-ts'

import { Service } from '@/Service/index'
import { Time } from '@/Time/index'

export interface Clock {
  readonly startTime: Date
  readonly getCurrentTime: Lazy<Time>
}

export function Clock(startTime: Date, getCurrentTime: Lazy<Time>): Clock {
  return {
    startTime,
    getCurrentTime,
  }
}

export namespace Clock {
  export const service: Service<Clock> = Service<Clock>('Clock')
}

export function toDate(time: Time) {
  return (clock: Clock): Date => new Date(clock.startTime.getTime() + time)
}

export function toTime(date: Date) {
  return (clock: Clock): Time => Time(clock.startTime.getTime() - date.getTime())
}
