import { flow } from 'hkt-ts/function'

import { Stream } from './Stream'

import { lazy } from '@/Fx/lazy'
import { Sink } from '@/Sink/Sink'

export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E>(stream: Stream<R, E, A>): Stream<R, E, B> =>
    Map.make(stream, f)

export class Map<R, E, A, B> extends Stream<R, E, B> {
  constructor(readonly stream: Stream<R, E, A>, readonly f: (a: A) => B) {
    super((sink, scheduler) => stream.fork(new FilterMapSink(sink, f), scheduler))
  }

  static make<R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => B) {
    if (stream instanceof Map) {
      return new Map(stream.stream, flow(stream.f, f))
    }

    return new Map(stream, f)
  }
}

export class FilterMapSink<E, A, B> extends Sink<E, A> {
  constructor(readonly sink: Sink<E, B>, readonly f: (a: A) => B) {
    super()
  }

  readonly event = (value: A) =>
    lazy(() => {
      const { sink, f } = this

      return sink.event(f(value))
    })

  readonly end = this.sink.end
}
