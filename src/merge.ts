import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred } from './_internal.js'

export function merge<R2, E2, B, E3>(other: Fx<R2, E2, B, E3>) {
  return <R, E, A, E1>(self: Fx<R, E, A, E1>): Fx<R | R2, E | E2, A | B, E1 | E3> =>
    mergeAll([self, other])
}

export function mergeAll<FX extends ReadonlyArray<Fx<any, any, any, any>>>(
  fx: readonly [...FX],
): Fx<
  Fx.ResourcesOf<FX[number]>,
  Fx.ErrorsOf<FX[number]>,
  Fx.OutputOf<FX[number]>,
  Fx.ReturnErrorsOf<FX[number]>
>

export function mergeAll<R2, E2, B, E3>(fx: Iterable<Fx<R2, E2, B, E3>>): Fx<R2, E2, B, E3>

export function mergeAll<R2, E2, B, E3>(fx: Iterable<Fx<R2, E2, B, E3>>): Fx<R2, E2, B, E3> {
  return Fx(<R4, E4, C>(sink: Sink<E2, B, R4, E4, C>) =>
    Effect.gen(function* ($) {
      const array = Array.from(fx)
      const deferred = yield* $(refCountDeferred<E3 | E4, C>(true, array.length))

      yield* $(
        Effect.forEachDiscard(array, (fx) =>
          Effect.fork(
            fx.run(
              Sink(
                sink.event,
                flow(sink.error, deferred.error),
                pipe(deferred.decrement, Effect.zipRight(deferred.endIfComplete(sink.end))),
              ),
            ),
          ),
        ),
      )

      return yield* $(deferred.await)
    }),
  )
}
