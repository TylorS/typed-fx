import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function snapshot<R2, E2, B, E3, A, C>(sampled: Fx<R2, E2, B, E3>, f: (a: A, b: B) => C) {
  return <R, E, E1>(sampler: Fx<R, E, A, E1>): Fx<R | R2, E | E2, C, E1 | E3> =>
    Fx((sink) =>
      Effect.gen(function* ($) {
        const ref = yield* $(Ref.makeRef<Maybe.Maybe<B>>(() => Maybe.none))

        yield* $(
          Effect.fork(sampled.run(Sink(flow(Maybe.some, ref.set), Effect.failCause, Effect.unit))),
        )

        return yield* $(
          sampler.run(
            Sink(
              (a) =>
                pipe(
                  ref.get,
                  Effect.flatMap(
                    Maybe.fold(
                      () => Effect.unit,
                      (b) => sink.event(f(a, b)),
                    ),
                  ),
                ),
              sink.error,
              sink.end,
            ),
          ),
        )
      }),
    )
}

export function sample<R2, E2, B, E3>(sampled: Fx<R2, E2, B, E3>) {
  return <R, E, A, E1>(sampler: Fx<R, E, A, E1>): Fx<R | R2, E | E2, B, E1 | E3> =>
    pipe(
      sampler,
      snapshot(sampled, (_, b) => b),
    )
}
