import * as M from 'hkt-ts/Maybe'
import { flow } from 'hkt-ts/function'

import { Stream } from './Stream'

import { Fx } from '@/Fx/Fx'
import { Sink } from '@/Sink/Sink'

export const filterMap =
  <A, B>(f: (a: A) => M.Maybe<B>) =>
  <R, E>(stream: Stream<R, E, A>): Stream<R, E, B> =>
    FilterMap.make(stream, f)

export class FilterMap<R, E, A, B> extends Stream<R, E, B> {
  constructor(readonly stream: Stream<R, E, A>, readonly filterMap: (a: A) => M.Maybe<B>) {
    super((sink, scheduler) => stream.run(new FilterMapSink(sink, filterMap), scheduler))
  }

  static make<R, E, A, B>(stream: Stream<R, E, A>, filterMap: (a: A) => M.Maybe<B>) {
    if (stream instanceof FilterMap) {
      return new FilterMap(stream.stream, flow(stream.filterMap, M.flatMap(filterMap)))
    }

    return new FilterMap(stream, filterMap)
  }
}

export class FilterMapSink<E, A, B> extends Sink<E, A> {
  constructor(readonly sink: Sink<E, B>, readonly filterMap: (a: A) => M.Maybe<B>) {
    super()
  }

  readonly event = (value: A) => {
    const { sink, filterMap } = this

    return Fx(function* () {
      const maybe = filterMap(value)

      if (M.isJust(maybe)) {
        yield* sink.event(maybe.value)
      }
    })
  }

  readonly error = this.sink.error
  readonly end = this.sink.end
}
