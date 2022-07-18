import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import type { RuntimeFiberParams } from '@/Runtime/Runtime'
import { Schedule } from '@/Schedule/Schedule'
import { ScheduleState } from '@/Schedule/ScheduleState'
import { Timer } from '@/Timer/Timer'

export abstract class Scheduler extends Timer {
  constructor(
    readonly timer: Timer,
    readonly schedule: <R, E, A>(
      fx: Fx<R, E, A>,
      schedule: Schedule,
      params?: RuntimeFiberParams,
    ) => Fx<R, never, Fiber<E, ScheduleState>>,
  ) {
    super(timer.clock, timer.setTimer)
  }

  abstract override readonly fork: () => Scheduler
}
