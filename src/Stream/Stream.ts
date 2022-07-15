import { Fiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { Fx } from '@/Fx/Fx'
import * as Sink from '@/Sink/Sink'

export class Stream<in out R, in out E, out A> {
  constructor(readonly fork: ForkStream<R, E, A>) {}
}

export type ForkStream<R, E, A> = (
  sink: Sink.Sink<E, A>,
  context: FiberContext,
) => Fx<R, never, Fiber<E, unknown>>
