import { Disposable } from '@/Disposable/Disposable.js'
import { Env } from '@/Env/Env.js'
import { Live } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Fx } from '@/Fx/Fx.js'
import { Schedule } from '@/Schedule/Schedule.js'
import { ScheduleState } from '@/Schedule/ScheduleState.js'
import { Service } from '@/Service/Service.js'

export interface Scheduler extends Disposable {
  readonly asap: <R, E, A>(
    fx: Fx<R, E, A>,
    env: Env<R>,
    context: FiberContext<FiberId.Live>,
  ) => Live<E, A>

  readonly schedule: <R, E, A>(
    fx: Fx<R, E, A>,
    schedule: Schedule,
    env: Env<R>,
    context: FiberContext<FiberId.Live>,
  ) => Live<E, ScheduleState>
}

export const Scheduler = Service<Scheduler>('Scheduler')
