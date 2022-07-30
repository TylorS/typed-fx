import { Fiber } from '../Fiber/Fiber.js'
import { FiberContext } from '../FiberContext/FiberContext.js'
import { RIO } from '../Fx/Fx.js'
import { Closeable } from '../Scope/Closeable.js'
import { Sink } from '../Sink/Sink.js'

export class Stream<R, E, A> {
  constructor(readonly fork: (sink: Sink<E, A>, context: StreamContext) => RIO<R, Fiber<E, any>>) {}
}

export interface StreamContext extends Omit<FiberContext, 'id'> {
  readonly scope: Closeable
}
