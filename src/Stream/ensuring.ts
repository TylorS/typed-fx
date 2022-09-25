import { Left, Right } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import * as Fx from '@/Fx/Fx.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function ensuring(finalizer: Finalizer, __trace?: string) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> => {
    return Stream((sink, context) =>
      stream.fork(addTrace(new EnsuringSink(sink, finalizer), __trace), context),
    )
  }
}

class EnsuringSink<E, A, E2> implements Sink<E, A, E2> {
  constructor(readonly sink: Sink<E, A, E2>, readonly finalizer: Finalizer) {}

  event = this.sink.event

  error = (cause: Cause<E>) =>
    pipe(
      this.finalizer(Left(cause)),
      Fx.flatMap(() => this.sink.error(cause)),
    )

  end = Fx.lazy(() =>
    pipe(
      this.finalizer(Right(undefined)),
      Fx.flatMap(() => this.sink.end),
    ),
  )
}
