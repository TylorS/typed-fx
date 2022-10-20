import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Stream } from './Stream.js'

import * as Sink from '@/Sink/Sink.js'

export function flatMapEffect<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R2 | R, E, B, E1 | E2> =>
    Stream((sink) => stream.fork(pipe(sink, Sink.mapInputEventEffect(f))))
}
