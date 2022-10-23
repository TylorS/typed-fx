import * as Cause from '@effect/core/io/Cause'
import { Effect } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Either from '@tsplus/stdlib/data/Either'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { fromEffect } from './fromEffect.js'

export function orElseCause<E, R2, E2, B, E3>(f: (e: Cause.Cause<E>) => Fx<R2, E2, B, E3>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1 | E3> =>
    Fx((sink) => fx.run(Sink(sink.event, (e) => f(e).run(sink), sink.end)))
}

export function orElse<E, R2, E2, B, E3>(f: (e: E) => Fx<R2, E2, B, E3>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1 | E3> =>
    Fx((sink) =>
      fx.run(
        Sink(
          sink.event,
          (e) =>
            pipe(
              Cause.failureOrCause(e),
              Either.fold((e) => f(e).run(sink), sink.error),
            ),
          sink.end,
        ),
      ),
    )
}

export function orElseCauseEffect<E, R2, E2, B>(f: (e: Cause.Cause<E>) => Effect<R2, E2, B>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1> =>
    pipe(
      fx,
      orElseCause((e) => fromEffect(f(e))),
    )
}

export function orElseEffect<E, R2, E2, B>(f: (e: E) => Effect<R2, E2, B>) {
  return <R, A, E1>(fx: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1> =>
    pipe(
      fx,
      orElse((e: E) => fromEffect(f(e))),
    )
}
