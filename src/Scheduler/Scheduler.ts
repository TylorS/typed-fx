import { Environment } from '@/Environment/Environment'
import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { Schedule } from '@/Schedule/Schedule'
import { Service } from '@/Service/Service'

export class Scheduler extends Service<SchedulerApi> {
  constructor(
    readonly schedule: <R extends Service<any>, E, A>(
      fx: Fx<R, E, A>,
      environment: Environment<R>,
      schedule: Schedule,
    ) => Fiber<E, A>,
  ) {
    super({ schedule })
  }
}

export interface SchedulerApi {
  readonly schedule: <R extends Service<any>, E, A>(
    fx: Fx<R, E, A>,
    environment: Environment<R>,
    schedule: Schedule,
  ) => Fiber<E, A>
}
