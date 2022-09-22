import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'

import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import { Fiber } from '@/Fiber/Fiber.js'
import { both } from '@/Fiber/hkt.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { Live } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function merge<R2, E2, B>(second: Stream<R2, E2, B>, __trace?: string) {
  return <R, E, A>(first: Stream<R, E, A>): Stream<R | R2, E | E2, A | B> =>
    MergeStream.make(first, second, __trace)
}

export class MergeStream<R, E, A, R2, E2, B> implements Stream<R | R2, E | E2, A | B> {
  constructor(
    readonly first: Stream<R, E, A>,
    readonly second: Stream<R2, E2, B>,
    readonly __trace?: string,
  ) {}

  fork = <E3>(sink: Sink<E | E2, A | B, E3>, scheduler: Scheduler, context: FiberContext<Live>) => {
    const { first, second, __trace } = this
    const mergeSink = addTrace(
      new MergeSink<E | E2, A | B, E3>(sink, AtomicCounter(NonNegativeInteger(2))),
      __trace,
    )

    return Fx.Fx(function* () {
      const firstFiber: Fiber<E3, any> = yield* first.fork(mergeSink, scheduler, context)
      const secondFiber: Fiber<E3, any> = yield* second.fork(mergeSink, scheduler, context.fork())

      return both(secondFiber)(firstFiber)
    })
  }

  static make<R, E, A, R2, E2, B>(
    first: Stream<R, E, A>,
    second: Stream<R2, E2, B>,
    __trace?: string,
  ): Stream<R | R2, E | E2, A | B> {
    return new MergeStream(first, second, __trace)
  }
}

class MergeSink<E, A, E2> implements Sink<E, A, E2> {
  constructor(readonly sink: Sink<E, A, E2>, readonly refCount: AtomicCounter) {}

  event = this.sink.event
  error = this.sink.error
  end = Fx.lazy(() => {
    if (decrement(this.refCount) === 0) {
      return this.sink.end
    }

    return Fx.unit
  })
}
