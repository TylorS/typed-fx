import * as Effect from '@effect/core/io/Effect'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function observeNow<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    fx.run(Sink<E, A, R | R2, E | E1 | E2, void>(f, Effect.failCause, Effect.unit))
}

export function observe<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    Effect.fork(observeNow(f)(fx))
}

export function observeDaemon<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Effect.Effect<R | R2, E | E1 | E2, void> =>
    Effect.forkDaemon(observeNow(f)(fx))
}
