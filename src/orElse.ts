import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Either from '@tsplus/stdlib/data/Either'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'
import { failCause } from './fromEffect.js'

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
  return Push((emitter) =>
    withDynamicCountdownLatch(
      1,
      ({ increment, latch }) =>
        push.run(
          Emitter(
            emitter.emit,
            (a) =>
              pipe(
                increment,
                Effect.orElse(() =>
                  Effect.forkScoped(
                    f(a).run(Emitter(emitter.emit, emitter.failCause, latch.countDown)),
                  ),
                ),
              ),
            latch.countDown,
          ),
        ),
      emitter.end,
    ),
  )
}
