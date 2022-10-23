import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Either from '@tsplus/stdlib/data/Either'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { map } from './map.js'

export function tap<A, B>(f: (a: A) => B) {
  return map((a: A) => (f(a), a))
}

export function tapEffect<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A, E1 | E2> =>
    Fx((sink) =>
      fx.run(Sink((a) => pipe(a, f, Effect.zipRight(sink.event(a))), sink.error, sink.end)),
    )
}

export function tapCauseEffect<E, R2, E2, B>(f: (e: Cause.Cause<E>) => Effect.Effect<R2, E2, B>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A, E1 | E2> =>
    Fx((sink) =>
      fx.run(Sink(sink.event, (e) => pipe(e, f, Effect.zipRight(sink.error(e))), sink.end)),
    )
}

export function tapErrorEffect<E, R2, E2, B>(f: (e: E) => Effect.Effect<R2, E2, B>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A, E1 | E2> =>
    Fx((sink) =>
      fx.run(
        Sink(
          sink.event,
          (e) =>
            pipe(
              Cause.failureOrCause(e),
              Either.fold(flow(f, Effect.zipRight(sink.error(e))), sink.error),
            ),
          sink.end,
        ),
      ),
    )
}

export function tapEndEffect<R2, E2, B>(effect: Effect.Effect<R2, E2, B>) {
  return <R, E, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A, E1 | E2> =>
    Fx((sink) => fx.run(Sink(sink.event, sink.error, Effect.zipRight(sink.end)(effect))))
}
