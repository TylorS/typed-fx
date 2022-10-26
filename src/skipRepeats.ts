import * as Effect from '@effect/core/io/Effect'
import { makeRef } from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'
import { Equivalence } from '@tsplus/stdlib/prelude/Equivalence'

import { Emitter, Push } from './Push.js'

export function skipRepeats<A>(E: Equivalence<A>) {
  const equals = Maybe.getEquivalence(E).equals

  return <R, E>(push: Push<R, E, A>): Push<R, E, A> =>
    Push((sink) =>
      pipe(
        makeRef<Maybe.Maybe<A>>(() => Maybe.none),
        Effect.flatMap((ref) =>
          push.run(
            Emitter(
              (a) =>
                Effect.flatten(
                  ref.modify((m) => {
                    const m2 = Maybe.some(a)
                    return [equals(m, m2) ? Effect.unit : sink.emit(a), m2]
                  }),
                ),
              sink.failCause,
              sink.end,
            ),
          ),
        ),
      ),
    )
}
