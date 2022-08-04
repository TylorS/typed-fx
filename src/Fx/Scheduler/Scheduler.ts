import { Fiber } from '../Fiber/Fiber.js'
import { Fx, RIO } from '../Fx/index.js'

import * as Clock from '@/Clock/Clock.js'
import { Schedule } from '@/Schedule/Schedule.js'

export interface Scheduler extends Clock.Clock {
  readonly schedule: <R, E, A>(fx: Fx<R, E, A>, schedule: Schedule) => RIO<R, Fiber<E, A>>
}

export function fork(scheduler: Scheduler): Scheduler {
  return {
    ...Clock.fork(scheduler),
    schedule: scheduler.schedule,
  }
}
