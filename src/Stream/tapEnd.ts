import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function tapEnd<R2, E2, B>(fx: Fx.Fx<R2, E2, B>, __trace?: string) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    Stream(<R3, E3>(sink: Sink<E | E2, A, R3, E3>) =>
      Fx.access((env: Env<R2>) =>
        stream.fork(addTrace(new TapEndSink<E | E2, R3, A, E3, R2, B>(sink, env, fx), __trace)),
      ),
    )
}

class TapEndSink<E, R3, A, E2, R2, B> implements Sink<E, A, R2 | R3, E2> {
  constructor(
    readonly sink: Sink<E, A, R3, E2>,
    readonly env: Env<R2>,
    readonly fx: Fx.Fx<R2, E, B>,
  ) {}

  event = this.sink.event
  error = this.sink.error

  end: Sink<E, A, R2 | R3, E2>['end'] = Fx.lazy(() =>
    pipe(
      this.fx,
      Fx.matchCause(
        (cause) => this.sink.error(cause),
        () => this.sink.end,
      ),
    ),
  )
}
