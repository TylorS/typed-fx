import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'
import { withDynamicCountdownLatch } from './_internal.js'

export function combine<R2, E2, B>(second: Push<R2, E2, B>) {
  return <R, E, A>(first: Push<R, E, A>): Push<R | R2, E | E2, readonly [A, B]> =>
    combineAll([first, second])
}

export function combineAll<Pushes extends ReadonlyArray<Push<any, any, any>>>(
  pushes: readonly [...Pushes],
): Push<
  Push.ResourcesOf<Pushes[number]>,
  Push.ErrorsOf<Pushes[number]>,
  { readonly [K in keyof Pushes]: Push.OutputOf<Pushes[K]> }
>

export function combineAll<R, E, A>(iterable: Iterable<Push<R, E, A>>): Push<R, E, ReadonlyArray<A>>

export function combineAll<R, E, A>(
  iterable: Iterable<Push<R, E, A>>,
): Push<R, E, ReadonlyArray<A>> {
  return Push((emitter) =>
    Effect.suspendSucceed(() => {
      const array = Array.from(iterable)

      return pipe(
        Effect.sync<Maybe.Maybe<A>[]>(() => Array(array.length)),
        Effect.flatMap((ref) =>
          Effect.suspendSucceed(() => {
            const emitIfReady = pipe(
              Effect.sync(() => ref.filter(Maybe.isSome).map((x) => x.value)),
              Effect.flatMap((bs) => (bs.length === array.length ? emitter.emit(bs) : Effect.unit)),
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
