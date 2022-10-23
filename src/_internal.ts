import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { Exit } from '@effect/core/io/Exit'
import * as Fiber from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import * as Schedule from '@effect/core/io/Schedule'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'
import { isSome } from '@tsplus/stdlib/data/Maybe'

export const asap = Schedule.delayed(() => Duration.millis(0))(Schedule.once)

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

export function deferredCallback<E, A, R2, E2>(
  f: (cb: (exit: Exit<E, A>) => Effect.Effect<never, never, never>) => Effect.Effect<R2, E2, A>,
): Effect.Effect<R2, E | E2, A> {
  return Effect.scoped(
    Effect.gen(function* ($) {
      const deferred = yield* $(Deferred.make<E, A>())
      const fiber = yield* $(
        Effect.forkScoped(
          f((exit) => {
            deferred.unsafeDone(Effect.done(exit))

            return Effect.never
          }),
        ),
      )

      yield* $(Effect.addFinalizer(Fiber.interrupt(fiber)))

      return yield* $(Effect.race(deferred.await)(Fiber.join(fiber)))
    }),
  )
}

type RefOutput<T> = T extends Ref.Ref<infer R> ? R : never

export function tupleRef<Refs extends ReadonlyArray<Ref.Ref<any>>>(
  refs: readonly [...Refs],
): Ref.Ref<{ readonly [K in keyof Refs]: RefOutput<Refs[K]> }> {
  const get = Effect.gen(function* ($) {
    const result: any[] = []

    for (const ref of refs) {
      result.push(yield* $(ref.get))
    }

    return result as unknown as { readonly [K in keyof Refs]: RefOutput<Refs[K]> }
  })

  const set = (a: { readonly [K in keyof Refs]: RefOutput<Refs[K]> }) =>
    Effect.gen(function* ($) {
      let i = 0
      for (const ref of refs) {
        yield* $(ref.set(a[i++]))
      }
    })

  const tupledRef = {
    [Ref.RefSym]: Ref.RefSym,
    get,
    set,
    update: (f) =>
      pipe(
        get,
        Effect.flatMap((a) => set(f(a))),
      ),
    updateSome: (f) =>
      pipe(
        get,
        Effect.map(f),
        Effect.flatMap((a) => (isSome(a) ? set(a.value) : Effect.unit)),
      ),
    modify: (f) =>
      pipe(
        get,
        Effect.map(f),
        Effect.flatMap(([b, a]) => pipe(a, set, Effect.as(b))),
      ),
    modifySome: (fallback, f) =>
      pipe(
        get,
        Effect.map(f),
        Effect.flatMap((maybe) =>
          isSome(maybe)
            ? pipe(maybe.value[1], set, Effect.as(maybe.value[0]))
            : Effect.succeed(fallback),
        ),
      ),
    getAndSet: (a) => pipe(get, Effect.zipLeft(set(a))),
    getAndUpdate: (f) => pipe(get, Effect.zipLeft(tupledRef.update(f))),
    getAndUpdateSome: (f) => pipe(get, Effect.zipLeft(tupledRef.updateSome(f))),
    updateAndGet: (f) => pipe(tupledRef.update(f), Effect.zipRight(get)),
    updateSomeAndGet: (f) => pipe(tupledRef.updateSome(f), Effect.zipRight(get)),
  } as Ref.Ref<{ readonly [K in keyof Refs]: RefOutput<Refs[K]> }>

  return tupledRef
}
