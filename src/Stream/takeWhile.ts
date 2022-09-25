import { Refinement } from 'hkt-ts/Refinement'

import { Stream } from './Stream.js'

import { Sink, addTrace } from '@/Sink/Sink.js'

export function takeWhile<A, B extends A>(
  refine: Refinement<A, B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B>

export function takeWhile<A>(
  p: (a: A) => boolean,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A>

export function takeWhile<A>(p: (a: A) => boolean, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R, E, A> => {
    return Stream((sink, context) =>
      stream.fork(addTrace(new TakeWhileSink(sink, p), __trace), context),
    )
  }
}

class TakeWhileSink<E, A, E2> {
  constructor(readonly sink: Sink<E, A, E2>, readonly p: (a: A) => boolean) {}

  event(a: A) {
    if (this.p(a)) {
      return this.sink.event(a)
    } else {
      return this.sink.end
    }
  }

  error = this.sink.error
  end = this.sink.end
}
