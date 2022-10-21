import * as Effect from '@effect/core/io/Effect'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function observeNow<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    stream.run(Sink<E, A, R | R2, E | E1 | E2, void>(f, Effect.failCause, Effect.unit))
}

export function observe<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    Effect.fork(observeNow(f)(stream))
}

export function observeDaemon<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    Effect.forkDaemon(observeNow(f)(stream))
}
