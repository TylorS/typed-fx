import { Maybe } from '@tsplus/stdlib/data/Maybe'

import { Stream } from './Stream.js'

import * as Sink from '@/Sink/index.js'

export function filterMap<A, B>(f: (a: A) => Maybe<B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, B, E1> =>
    Stream((sink) => stream.fork(Sink.filterMap(f)(sink)))
}
