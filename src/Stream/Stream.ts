import { Fiber } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export interface Stream<R = never, E = never, A = unknown> {
  readonly fork: <E2 = never>(
    sink: Sink<E | E2, A>,
    scheduler: Scheduler,
    context: FiberContext<FiberId.Live>,
  ) => Fx.RIO<R, Fiber<E | E2, any>>
}

export interface RIO<R, A> extends Stream<R, never, A> {}
export interface IO<E, A> extends Stream<never, E, A> {}
export interface Of<A> extends Stream<never, never, A> {}

export function Stream<R, E, A>(fork: Stream<R, E, A>['fork']) {
  return { fork }
}
