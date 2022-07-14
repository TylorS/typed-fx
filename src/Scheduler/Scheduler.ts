import { Clock } from '@/Clock/Clock'
import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { Schedule } from '@/Schedule/Schedule'
import { ScheduleState } from '@/Schedule/ScheduleState'

export class Scheduler extends Clock {
  constructor(
    readonly clock: Clock,
    readonly schedule: <R, E, A>(
      fx: Fx<R, E, A>,
      schedule: Schedule,
    ) => Fx<R, never, Fiber<E, ScheduleState>>,
  ) {
    super(clock.startTime, clock.currentTime)
  }
}
