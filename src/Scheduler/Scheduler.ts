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
  readonly asap: <R, E, A, E2 = E, B = A>(
    fx: Fx<R, E, A>,
    env: Env<R>,
    context: FiberContext<FiberId.Live>,
    transform?: (fx: Fx<R, E, A>) => Fx<R, E2, B>,
  ) => Live<E2, B>

  readonly schedule: <R, E, A, E2 = E, B = A>(
    fx: Fx<R, E, A>,
    schedule: Schedule,
    env: Env<R>,
    context: FiberContext<FiberId.Live>,
    transform?: (fx: Fx<R, E, A>) => Fx<R, E2, B>,
  ) => Live<E2, ScheduleState>
}

export const Scheduler = Service<Scheduler>('Scheduler')
