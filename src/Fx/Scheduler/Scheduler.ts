import type { Fiber } from '../Fiber/Fiber.js'
import * as Fx from '../Fx/Fx.js'
import { ForkParams } from '../Fx/Instruction/Fork.js'
import * as Timer from '../Timer/Timer.js'

import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Service } from '@/Service/index.js'

export interface Scheduler extends Timer.Timer {
  /**
   * Schedule an Fx to run on a particular Schedule
   */
  readonly schedule: <R, E, A>(
    fx: Fx.Fx<R, E, A>,
    schedule?: Schedule,
    params?: ForkParams,
  ) => Fx.RIO<R, Fiber<E, ScheduleState>>

  /**
   * Fork the Scheduler
   */
  readonly fork: () => Scheduler
}

export const Scheduler = Service<Scheduler>('Scheduler')

export function make(timer: Timer.Timer, schedule: Scheduler['schedule']): Scheduler {
  return {
    ...timer,
    schedule,
    fork: () => make(Timer.fork(timer), schedule),
  }
}
