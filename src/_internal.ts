import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'

export function refCountDeferred<E, A>(initialEnded = false, initialCount = 0) {
  return Effect.gen(function* ($) {
    const ended = yield* $(Ref.makeRef<boolean>(() => initialEnded))
    const ref = yield* $(Ref.makeSynchronized(() => initialCount))
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

export const fromExit = <E, A>(exit: Exit.Exit<E, A>) =>
  pipe(exit, Exit.fold<E, A, Effect.Effect<never, E, A>>(Effect.failCause, Effect.succeed))
