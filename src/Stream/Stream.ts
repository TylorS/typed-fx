import { Fiber } from '@/Fiber/Fiber.js'
import { RIO } from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export class Stream<R, E, A> {
  constructor(
    readonly fork: <E2>(sink: Sink<E | E2, A>, scheduler: Scheduler) => RIO<R, Fiber<E | E2, any>>,
  ) {}
}
