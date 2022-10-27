import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Either from '@tsplus/stdlib/data/Either'

import { Push } from './Push.js'
import { failCause } from './fromEffect.js'
import { runObserve } from './runObserve.js'

export function orElseCause<E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Push<R2, E2, B>) {
  return <R, A>(push: Push<R, E, A>): Push<R | R2, E2, A | B> => orElseCause_(push, f)
}

export function orElse<E, R2, E2, B>(f: (error: E) => Push<R2, E2, B>) {
  return <R, A>(push: Push<R, E, A>): Push<R | R2, E2, A | B> =>
    orElseCause_(push, flow(Cause.failureOrCause, Either.fold(f, failCause)))
}

function orElseCause_<R, E, A, R2, E2, B>(
  push: Push<R, E, A>,
  f: (cause: Cause.Cause<E>) => Push<R2, E2, B>,
): Push<R | R2, E2, A | B> {
  return Push((emitter) => {
    return pipe(
      push,
      runObserve(emitter.emit),
      Effect.foldCauseEffect(
        (c) => f(c).run(emitter),
        () => emitter.end,
      ),
    )
  })
}
