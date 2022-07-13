import { Lazy } from 'hkt-ts'
import { Branded } from 'hkt-ts/Branded'

import { Service } from '@/Service/Service'

/**
 * A Monotonic representation of time
 */
export type Time = Branded<{ readonly Time: number }, number>
export const Time = Branded<Time>()

/**
 * A Clock is an abstraction for retrieving a monotonic form of the current time
 */
export class Clock extends Service {
  /**
   * Retrieve the current Time
   */
  constructor(readonly currentTime: Lazy<Time>) {
    super()
  }
}

export function relative(clock: Clock): Clock {
  const offset = clock.currentTime()

  return new Clock(() => Time(clock.currentTime() - offset))
}
