import { Fiber } from '../Fiber/Fiber.js'
import * as Fx from '../Fx/Fx.js'

import * as Clock from '@/Clock/Clock.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Service } from '@/Service/index.js'

export interface Scheduler extends Clock.Clock {
  /**
   * Schedule an Fx to run on a particular Schedule
   */
  readonly schedule: <R, E, A>(
    fx: Fx.Fx<R, E, A>,
    schedule: Schedule,
  ) => Fx.RIO<R, Fiber<E, ScheduleState>>

  /**
   * Fork the Scheduler
   */
  readonly fork: () => Scheduler
}

export const Scheduler = Service<Scheduler>('Scheduler')

export function make(clock: Clock.Clock, schedule: Scheduler['schedule']): Scheduler {
  return {
    ...clock,
    schedule,
    fork: () => make(Clock.fork(clock), schedule),
  }
}
