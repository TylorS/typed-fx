import { Fiber } from '../Fiber/Fiber.js'
import { RIO } from '../Fx/Fx.js'
import { Scheduler } from '../Scheduler/Scheduler.js'
import { Sink } from '../Sink/Sink.js'

export class Stream<R, E, A> {
  constructor(readonly fork: (sink: Sink<E, A>, scheduler: Scheduler) => RIO<R, Fiber<E, any>>) {}
}
