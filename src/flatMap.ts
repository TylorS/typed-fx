import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'
import { Map } from './filterMap.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Push<R2, E2, B>) {
  return <R, E>(push: Push<R, E, A>): Push<R | R2, E | E2, B> =>
    push instanceof Map ? flatMap_(push.push, flow(push.f, f)) : flatMap_(push, f)
}

function flatMap_<R, E, A, R2, E2, B>(push: Push<R, E, A>, f: (a: A) => Push<R2, E2, B>) {
  return Push((emitter) =>
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
                    f(a).run(Emitter(emitter.emit, emitter.failCause, latch.countDown)),
                  ),
                ),
              ),
            emitter.failCause,
            latch.countDown,
          ),
        ),
      emitter.end,
    ),
  )
}
