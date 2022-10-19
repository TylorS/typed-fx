import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'

import { Stream } from './Stream.js'

import * as Sink from '@/Sink/Sink.js'

export function drain<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, never, Fiber<E | E1, void>> {
  return stream.fork(Sink.drain<E, A>())
}

export function observe<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(
    stream: Stream<R, E, A, E1>,
  ): Effect.Effect<R2 | R, never, Fiber<E2 | E1, void>> => stream.fork(Sink.Sink(f))
}

export function reduce<B, A>(b: B, f: (b: B, a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, B> =>
    Effect.fromFiberEffect(stream.fork(Sink.reduce<E | E1, B, A>(b, f)))
}
