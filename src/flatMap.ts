import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Push<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    Push((emitter) =>
      withDynamicCountdownLatch(
        1,
        ({ increment, latch }) =>
          push.run(
            Emitter(
              (a) =>
                pipe(
                  increment,
                  Effect.flatMap(() =>
                    Effect.forkScoped(
                      f(a).run(Emitter(emitter.event, emitter.error, latch.countDown)),
                    ),
                  ),
                ),
              emitter.error,
              latch.countDown,
            ),
          ),
        emitter.end,
      ),
    )
}
