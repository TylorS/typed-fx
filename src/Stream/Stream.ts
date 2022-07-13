import { Env } from '@/Env/Env'
import { Fiber } from '@/Fiber/Fiber'
import { Scheduler } from '@/Scheduler/Scheduler'
import { Sink } from '@/Sink/Sink'

export abstract class Stream<R, E, A> {
  abstract readonly run: (context: StreamContext<R>, sink: Sink<E, A>) => Fiber<E, A>
}

const InternalStream = Stream

export function make<R, E, A>(run: (context: StreamContext<R>, sink: Sink<E, A>) => Fiber<E, A>) {
  return class Stream extends InternalStream<R, E, A> {
    readonly run = run
  }
}

export interface StreamContext<R> {
  readonly env: Env<R>
  readonly scheduler: Scheduler
}
