import { Fiber } from '../Fiber/Fiber.js'
import { Fx } from '../Fx/Fx.js'

import { Clock } from '@/Clock/Clock.js'
import { Schedule } from '@/Schedule/Schedule.js'

export interface Scheduler extends Clock {
  readonly schedule: <R, E, A>(fx: Fx<R, E, A>, schedule: Schedule) => Fx<R, never, Fiber<E, A>>
}
