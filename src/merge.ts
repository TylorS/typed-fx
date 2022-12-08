import { Effect, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function merge<R2, E2, B>(second: Fx<R2, E2, B>) {
  return <R, E, A>(first: Fx<R, E, A>): Fx<R | R2, E | E2, A | B> => mergeAll([first, second])
}

export function mergeAll<FX extends ReadonlyArray<Fx<any, any, any>>>(
  fx: readonly [...FX],
): Fx<Fx.ResourcesOf<FX[number]>, Fx.ErrorsOf<FX[number]>, Fx.OutputOf<FX[number]>>

export function mergeAll<R, E, A>(iterable: Iterable<Fx<R, E, A>>): Fx<R, E, A>

export function mergeAll<R, E, A>(iterable: Iterable<Fx<R, E, A>>): Fx<R, E, A> {
  return Fx((emitter) => {
    const array = Array.from(iterable)

    if (array.length === 0) {
      return emitter.end
    }

    return withDynamicCountdownLatch(
      array.length,
      (latch) =>
        pipe(
          array,
          Effect.forEachDiscard((fx) =>
            Effect.forkScoped(fx.run(Emitter(emitter.emit, emitter.failCause, latch.decrement))),
          ),
        ),
      emitter.end,
    )
  })
}
