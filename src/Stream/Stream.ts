import { Fiber } from '@/Fiber/Fiber.js'
import { SchedulerContext } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export interface Stream<R, E, A> {
  readonly fork: <E2 = never, R2 = never>(
    sink: Sink<E | E2, A>,
    context: SchedulerContext<R | R2>,
  ) => Fiber<E | E2, any>
}
