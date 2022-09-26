import { Maybe } from 'hkt-ts'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Stream } from './Stream.js'

import { unit } from '@/Fx/index.js'
import { Sink, addTrace } from '@/Sink/Sink.js'

export function skipRepeatsWith<A>(
  E: Eq<A>,
  __trace?: string,
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return (stream) => Stream((sink) => stream.fork(addTrace(new SkipRepeatsSink(sink, E), __trace)))
}

export function skipRepeats<R, E, A>(stream: Stream<R, E, A>, __trace?: string): Stream<R, E, A> {
  return skipRepeatsWith<A>(DeepEquals, __trace)(stream)
}

class SkipRepeatsSink<E, A, R2, E2> implements Sink<E, A, R2, E2> {
  constructor(readonly sink: Sink<E, A, R2, E2>, readonly E: Eq<A>) {}

  protected last: Maybe.Maybe<A> = Maybe.Nothing
  protected elem = Maybe.contains(this.E)

  event(value: A) {
    if (this.elem(value)(this.last)) {
      return unit
    }

    this.last = Maybe.Just(value)

    return this.sink.event(value)
  }

  error = this.sink.error
  end = this.sink.end
}
