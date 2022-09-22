import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { FiberRef } from '@/FiberRef/FiberRef.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { flatMap, fromLazy } from '@/Fx/Fx.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function setFiberRefLocally<R, E, A>(fiberRef: FiberRef<R, E, A>, value: () => A) {
  return <R2, E2, A2>(fx: Stream<R2, E2, A2>) => new SetFiberRefLocallyStream(fx, fiberRef, value)
}

export class SetFiberRefLocallyStream<R, E, A, R2, E2, A2> implements Stream<R2, E2, A2> {
  constructor(
    readonly stream: Stream<R2, E2, A2>,
    readonly fiberRef: FiberRef<R, E, A>,
    readonly value: () => A,
  ) {}

  fork<E3>(sink: Sink<E2, A2, E3>, scheduler: Scheduler, context: FiberContext<FiberId.Live>) {
    return pipe(
      fromLazy(() => {
        // SetFiberRef
        FiberRefs.setFiberRefLocally(this.fiberRef, this.value())(context.fiberRefs)

        // Ensure it is popped off when the stream ends
        context.scope.ensuring(() =>
          fromLazy(() => FiberRefs.popLocalFiberRef(this.fiberRef)(context.fiberRefs)),
        )
      }),
      flatMap(() => this.stream.fork(sink, scheduler, context)),
    )
  }
}
