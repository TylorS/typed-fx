import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { Sink } from '@/Sink/Sink.js'

export function fromArray<A>(array: ReadonlyArray<A>, __trace?: string): Stream<never, never, A> {
  return new FromArrayStream(array, __trace)
}

export class FromArrayStream<R, E, A> implements Stream<R, E, A> {
  readonly _tag = 'FromArrayStream'
  constructor(readonly array: ReadonlyArray<A>, readonly __trace?: string) {}

  fork<E2>(sink: Sink<E, A, E2>, context: FiberContext<FiberId.Live>) {
    const { array, __trace } = this

    return Fx.forkInContext(
      context,
      __trace,
    )(
      pipe(
        Fx.zipAll(array.map(sink.event)),
        Fx.tap(() => sink.end),
      ),
    )
  }
}
