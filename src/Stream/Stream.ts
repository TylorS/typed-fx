import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { Scheduler } from '@/Scheduler/Scheduler'
import * as Sink from '@/Sink/Sink'

export class Stream<R, E, A> {
  constructor(readonly run: RunStream<R, E, A>) {}
}

export type RunStream<R, E, A> = (
  sink: Sink.Sink<E, A>,
  scheduler: Scheduler,
) => Fx<R, never, Fiber<E, unknown>>
