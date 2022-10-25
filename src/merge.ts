import * as Effect from '@effect/core/io/Effect'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function merge<R2, E2, B>(second: Push<R2, E2, B>) {
  return <R, E, A>(first: Push<R, E, A>): Push<R | R2, E | E2, A | B> => mergeAll([first, second])
}

export function mergeAll<Pushes extends ReadonlyArray<Push<any, any, any>>>(
  pushes: readonly [...Pushes],
): Push<
  Push.ResourcesOf<Pushes[number]>,
  Push.ErrorsOf<Pushes[number]>,
  Push.OutputOf<Pushes[number]>
>

export function mergeAll<R, E, A>(iterable: Iterable<Push<R, E, A>>): Push<R, E, A>

export function mergeAll<R, E, A>(iterable: Iterable<Push<R, E, A>>): Push<R, E, A> {
  return Push((emitter) => {
    const array = Array.from(iterable)

    return withDynamicCountdownLatch(
      array.length,
      ({ latch }) =>
        Effect.forEachDiscard(array, (push) =>
          Effect.forkScoped(push.run(Emitter(emitter.emit, emitter.failCause, latch.countDown))),
        ),
      emitter.end,
    )
  })
}
