import { Refinement } from 'hkt-ts/Refinement'

import { Stream } from './Stream.js'

import { Sink, addTrace } from '@/Sink/Sink.js'
import { unit } from '@/index.js'

export function skipWhile<A, B extends A>(
  refine: Refinement<A, B>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, Exclude<A, B>>

export function skipWhile<A>(
  p: (a: A) => boolean,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A>

export function skipWhile<A>(p: (a: A) => boolean, __trace?: string) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R, E, A> => {
    return Stream((sink) => stream.fork(addTrace(new SkipWhileSink(sink, p), __trace)))
  }
}

class SkipWhileSink<E, A, R2, E2> {
  protected _started = false

  constructor(readonly sink: Sink<E, A, R2, E2>, readonly p: (a: A) => boolean) {}

  event(a: A) {
    if (!this._started && this.p(a)) {
      return unit
    } else {
      this._started = true

      return this.sink.event(a)
    }
  }

  error = this.sink.error
  end = this.sink.end
}
