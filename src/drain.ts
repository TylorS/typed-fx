import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function drainNow<R, E, A, E1>(fx: Fx<R, E, A, E1>): Effect.Effect<R, E | E1, void> {
  return fx.run(Sink(Effect.succeed, Effect.failCause, Effect.unit))
}

export function drain<R, E, A, E1>(
  fx: Fx<R, E, A, E1>,
): Effect.Effect<R, never, Fiber.Runtime<E | E1, void>> {
  return Effect.fork(drainNow(fx))
}

export function drainDaemon<R, E, A, E1>(
  fx: Fx<R, E, A, E1>,
): Effect.Effect<R, never, Fiber.Runtime<E | E1, void>> {
  return Effect.forkDaemon(drainNow(fx))
}
