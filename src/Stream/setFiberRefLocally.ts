import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { FiberRef } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/index.js'
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

  fork<R3, E3>(sink: Sink<E2, A2, R3, E3>) {
    return Fx.lazy(() =>
      pipe(this.stream.fork(sink), Fx.fiberRefLocally(this.fiberRef, this.value())),
    )
  }
}
