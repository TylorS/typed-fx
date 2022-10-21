import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'

import { Sink } from './Sink.js'
import { Stream } from './Stream.js'

export function drainNow<R, E, A, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, void> {
  return stream.run(Sink(Effect.succeed, Effect.failCause, Effect.unit))
}

export function drain<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, never, Fiber.Runtime<E | E1, void>> {
  return Effect.fork(drainNow(stream))
}

export function drainDaemon<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, never, Fiber.Runtime<E | E1, void>> {
  return Effect.forkDaemon(drainNow(stream))
}
