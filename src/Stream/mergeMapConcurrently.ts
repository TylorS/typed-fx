import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'
import { FlatMap } from './flatMap.js'

import { Fx } from '@/Fx/Fx.js'
import { SchedulerContext } from '@/Scheduler/Scheduler.js'
import { Semaphore, acquire } from '@/Semaphore/Semaphore.js'

export function mergeMapConcurrently<A, R2, E2, B>(
  f: (a: A) => Stream<R2, E2, B>,
  concurrencyLevel: NonNegativeInteger,
) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    new MergeMapConcurrently(stream, f, acquire(new Semaphore(concurrencyLevel)))
}

export class MergeMapConcurrently<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => Stream<R2, E2, B>,
    readonly tramsform: <E, A>(fx: Fx<R | R2, E, A>) => Fx<R | R2, E, A>,
  ) {}

  readonly fork: Stream<R | R2, E | E2, B>['fork'] = (sink, context) => {
    const s = new FlatMap(this.stream, this.f)
    const schedulerContext: SchedulerContext<R | R2> = { ...context, transform: this.tramsform }

    return s.fork(sink, schedulerContext)
  }
}
