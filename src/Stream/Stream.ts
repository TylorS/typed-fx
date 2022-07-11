import { Environment } from '@/Environment/Environment'
import { Fiber } from '@/Fiber/Fiber'
import { Scheduler } from '@/Scheduler/Scheduler'
import { Service } from '@/Service/Service'
import { Sink } from '@/Sink/Sink'

export abstract class Stream<R extends Service<any>, E, A> {
  abstract readonly run: (context: StreamContext<R>, sink: Sink<E, A>) => Fiber<E, A>
}

const InternalStream = Stream

export function make<R extends Service<any>, E, A>(
  run: (context: StreamContext<R>, sink: Sink<E, A>) => Fiber<E, A>,
) {
  return class Stream extends InternalStream<R, E, A> {
    readonly run = run
  }
}

export interface StreamContext<R extends Service<any>> {
  readonly environment: Environment<R>
  readonly scheduler: Scheduler
}
