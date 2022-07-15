import { Clock } from '@/Clock/Clock'
import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import type { RuntimeFiberParams } from '@/Runtime/Runtime'
import { Schedule } from '@/Schedule/Schedule'
import { ScheduleState } from '@/Schedule/ScheduleState'

export abstract class Scheduler extends Clock {
  constructor(
    readonly clock: Clock,
    readonly schedule: <R, E, A>(
      fx: Fx<R, E, A>,
      schedule: Schedule,
      params?: RuntimeFiberParams,
    ) => Fx<R, never, Fiber<E, ScheduleState>>,
  ) {
    super(clock.startTime, clock.currentTime)
  }

  abstract override readonly fork: () => Scheduler
}
