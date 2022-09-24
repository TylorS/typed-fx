import { Stream } from './Stream.js'

import { Sink, addTrace } from '@/Sink/Sink.js'

export function skipAfter<A>(p: (a: A) => boolean, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R, E, A> => {
    return Stream((sink, scheduler, context) =>
      stream.fork(addTrace(new SkipAfterSink(sink, p), __trace), scheduler, context),
    )
  }
}

class SkipAfterSink<E, A, E2> {
  constructor(readonly sink: Sink<E, A, E2>, readonly p: (a: A) => boolean) {}

  event(a: A) {
    if (this.p(a)) {
      return this.sink.end
    } else {
      return this.sink.event(a)
    }
  }

  error = this.sink.error
  end = this.sink.end
}
