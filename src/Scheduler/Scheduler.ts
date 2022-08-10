import * as Clock from '@/Clock/Clock.js'
import { Fiber } from '@/Fiber/Fiber.js'
import { ForkParams } from '@/Fx/Instructions/Fork.js'
import { Fx, RIO, ask } from '@/Fx/index.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Service } from '@/Service/index.js'

export interface Scheduler extends Clock.Clock {
  readonly schedule: <R, E, A>(
    fx: Fx<R, E, A>,
    schedule: Schedule,
    params?: ForkParams,
  ) => RIO<R, Fiber<E, ScheduleState>>
}

export const Scheduler = Service<Scheduler>('Scheduler')

export function fork(scheduler: Scheduler): Scheduler {
  return {
    ...Clock.fork(scheduler),
    schedule: scheduler.schedule,
  }
}

export function schedule(schedule: Schedule) {
  return <R, E, A>(fx: Fx<R, E, A>): RIO<R | Scheduler, Fiber<E, ScheduleState>> =>
    Fx(function* () {
      const s: Scheduler = yield* ask(Scheduler)

      return yield* s.schedule(fx, schedule)
    })
}
