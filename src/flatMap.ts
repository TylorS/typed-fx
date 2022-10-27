import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'
import { Map } from './filterMap.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    fx instanceof Map ? flatMap_(fx.fx, flow(fx.f, f)) : flatMap_(fx, f)
}

function flatMap_<R, E, A, R2, E2, B>(fx: Fx<R, E, A>, f: (a: A) => Fx<R2, E2, B>) {
  return Fx((emitter) =>
    withDynamicCountdownLatch(
      1,
      ({ increment, latch }) =>
        fx.run(
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
