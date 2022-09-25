import { Stream } from './Stream.js'

import { unit } from '@/Fx/index.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function takeAfter<A>(p: (a: A) => boolean, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R, E, A> => {
    return Stream((sink, context) =>
      stream.fork(addTrace(new TakeAfterSink(sink, p), __trace), context),
    )
  }
}

class TakeAfterSink<E, A, E2> {
  protected _started = false

  constructor(readonly sink: Sink<E, A, E2>, readonly p: (a: A) => boolean) {}

  event(a: A) {
    if (this._started) {
      return this.sink.event(a)
    }

    if (this.p(a)) {
      this._started = true

      return this.sink.event(a)
    }

    return unit
  }

  error = this.sink.error
  end = this.sink.end
}
