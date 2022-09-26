import { pipe, second } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Sink } from '@/Sink/Sink.js'

export function zipItems<A, B, C>(f: (a: A, b: B) => C, array: ReadonlyArray<B>) {
  return <R, E>(stream: Stream<R, E, A>): Stream<R, E, C> => {
    return Stream((sink) => stream.fork(new ZipItemSink(sink, f, array)))
  }
}

export function withItems<B>(array: ReadonlyArray<B>) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, B> =>
    pipe(stream, zipItems(second, array))
}

class ZipItemSink<A, B, C, E, R2, E2> {
  protected _index = 0
  protected _endIndex = this.array.length - 1

  constructor(
    readonly sink: Sink<E, C, R2, E2>,
    readonly f: (a: A, b: B) => C,
    readonly array: ReadonlyArray<B>,
  ) {}

  event(a: A) {
    if (this._index <= this._endIndex) {
      this._index += 1
      return this.sink.event(this.f(a, this.array[this._index]))
    }

    return this.sink.end
  }

  error = this.sink.error
  end = this.sink.end
}
