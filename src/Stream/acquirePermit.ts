import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/index.js'
import * as Semaphore from '@/Semaphore/index.js'
import { Sink } from '@/Sink/Sink.js'

export function acquirePermit(semaphore: Semaphore.Semaphore) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    new AcquirePermitStream(stream, semaphore)
}

export class AcquirePermitStream<R, E, A> implements Stream<R, E, A> {
  constructor(readonly stream: Stream<R, E, A>, readonly semaphore: Semaphore.Semaphore) {}

  fork = <E2>(sink: Sink<E, A, E2>, scheduler: Scheduler, context: FiberContext<Live>) =>
    pipe(
      this.semaphore.prepare,
      Fx.flatMap(({ acquire, release }) =>
        pipe(
          acquire,
          Fx.tapLazy(() => context.scope.ensuring(() => release)),
          Fx.uninterruptable,
          Fx.flatMap(() => this.stream.fork(sink, scheduler, context)),
        ),
      ),
    )
}
