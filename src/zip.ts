import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function zip<R2, E2, B>(second: Fx<R2, E2, B>) {
  return <R, E, A>(first: Fx<R, E, A>): Fx<R | R2, E | E2, readonly [A, B]> =>
    zipAll([first, second])
}

export function zipAll<FX extends ReadonlyArray<Fx<any, any, any>>>(
  fx: readonly [...FX],
): Fx<
  Fx.ResourcesOf<FX[number]>,
  Fx.ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: Fx.OutputOf<FX[K]> }
>

export function zipAll<R, E, A>(iterable: Iterable<Fx<R, E, A>>): Fx<R, E, ReadonlyArray<A>>

export function zipAll<R, E, A>(iterable: Iterable<Fx<R, E, A>>): Fx<R, E, ReadonlyArray<A>> {
  return Fx((emitter) =>
    Effect.suspendSucceed(() => {
      const array = Array.from(iterable)

      if (array.length === 0) {
        return pipe(emitter.emit([]), Effect.zipRight(emitter.end))
      }

      return pipe(
        Effect.sync<Maybe.Maybe<A>[]>(() => Array(array.length)),
        Effect.flatMap((ref) =>
          Effect.suspendSucceed(() => {
            const emitIfReady = pipe(
              Effect.sync(() => ref.filter(Maybe.isSome).map((x) => x.value)),
              Effect.flatMap((bs) =>
                bs.length === array.length
                  ? Effect.suspendSucceed(() => (ref.fill(Maybe.none), emitter.emit(bs)))
                  : Effect.unit,
              ),
            )

            return withDynamicCountdownLatch(
              array.length,
              ({ latch }) =>
                Effect.forEachWithIndex(array, (push, i) =>
                  Effect.forkScoped(
                    push.run(
                      Emitter(
                        (a) =>
                          pipe(
                            Effect.sync(() => (ref[i] = Maybe.some(a))),
                            Effect.zipRight(emitIfReady),
                          ),
                        emitter.failCause,
                        latch.countDown,
                      ),
                    ),
                  ),
                ),
              emitter.end,
            )
          }),
        ),
      )
    }),
  )
}
