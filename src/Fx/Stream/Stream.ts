import { Fiber } from '../Fiber/Fiber.js'
import { FiberScope } from '../FiberScope/FiberScope.js'
import { RIO } from '../Fx/Fx.js'
import { Sink } from '../Sink/Sink.js'

export class Stream<R, E, A> {
  constructor(readonly fork: (sink: Sink<E, A>, scope: FiberScope) => RIO<R, Fiber<E, any>>) {}
}
