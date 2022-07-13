import { Clock } from '@/Clock/Clock'
import { Env } from '@/Env/Env'
import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { Schedule } from '@/Schedule/Schedule'

export class Scheduler extends Clock {
  constructor(
    readonly clock: Clock,
    readonly schedule: <R, E, A>(
      fx: Fx<R, E, A>,
      environment: Env<R>,
      schedule: Schedule,
    ) => Fiber<E, A>,
  ) {
    super(clock.startTime, clock.currentTime)
  }
}
