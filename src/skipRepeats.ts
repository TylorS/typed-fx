import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { Equivalence } from '@tsplus/stdlib/prelude/Equivalence'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function skipRepeats<A>(E: Equivalence<A>) {
  const equals = Maybe.getEquivalence(E).equals

  return <R, E, E1>(fx: Fx<R, E, A, E1>): Fx<R, E, A, E1> =>
    Fx((sink) =>
      pipe(
        makeRef<Maybe.Maybe<A>>(() => Maybe.none),
        Effect.flatMap((ref) =>
          fx.run(
            Sink(
              (a) =>
                Effect.flatten(
                  ref.modify((m) => [
                    equals(m, Maybe.some(a)) ? Effect.unit : sink.event(a),
                    Maybe.some(a),
                  ]),
                ),
              sink.error,
              sink.end,
            ),
          ),
        ),
      ),
    )
}
