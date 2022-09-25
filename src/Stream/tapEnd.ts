import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function tapEnd<R2, E2, B>(fx: Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    Stream(<E3>(sink: Sink<E | E2, A, E3>, context: FiberContext<FiberId.Live>) =>
      Fx.access((env: Env<R2>) =>
        stream.fork(
          addTrace(new TapEndSink<E | E2, A, E3, R2, B>(sink, env, fx), __trace),
          context,
        ),
      ),
    )
}

class TapEndSink<E, A, E2, R2, B> implements Sink<E, A, E2> {
  constructor(readonly sink: Sink<E, A, E2>, readonly env: Env<R2>, readonly fx: Fx.Fx<R2, E, B>) {}

  event = this.sink.event
  error = this.sink.error

  end = Fx.lazy(() =>
    pipe(
      this.fx,
      Fx.matchCause(
        (cause) => this.sink.error(cause),
        () => this.sink.end,
      ),
      Fx.provide(this.env),
    ),
  )
}
