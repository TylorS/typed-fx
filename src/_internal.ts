import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from 'node_modules/@fp-ts/data/Function.js'

export function refCountDeferred<E, A>(initialEnded = false) {
  return Effect.gen(function* ($) {
    const ended = yield* $(Ref.makeRef<boolean>(() => initialEnded))
    const ref = yield* $(Ref.makeSynchronized(() => 0))
    const deferred = yield* $(Deferred.make<E, A>())
    const increment = ref.update((a) => a + 1)
    const decrement = ref.update((a) => Math.max(0, a - 1))
    const refCount = ref.get

    return {
      await: deferred.await,
      endIfComplete: <R>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
        Effect.gen(function* ($) {
          if ((yield* $(ended.get)) && (yield* $(refCount)) === 0) {
            yield* $(pipe(effect, Effect.intoDeferred(deferred)))
          }
        }),
      error: <R>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
        Effect.gen(function* ($) {
          yield* $(ended.set(true))
          yield* $(pipe(effect, Effect.intoDeferred(deferred)))
        }),
      increment,
      decrement,
      refCount,
      end: ended.set(true),
    }
  })
}
