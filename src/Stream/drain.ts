import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'
import * as Ref from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'
import { AssociativeIdentity } from '@tsplus/stdlib/prelude/AssociativeIdentity'

import { Stream } from './Stream.js'

import * as Sink from '@/Sink/Sink.js'

export function drain<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, never, Fiber<E | E1, void>> {
  return pipe(
    Deferred.make<E | E1, void>(),
    Effect.flatMap((deferred) =>
      pipe(
        stream.fork(
          Sink.Sink(
            () => Effect.unit,
            flow(Effect.failCause, Effect.intoDeferred(deferred), Effect.asUnit),
            pipe(Effect.unit, Effect.intoDeferred(deferred), Effect.asUnit),
          ),
        ),
        Effect.zipRight(deferred.await),
      ),
    ),
    Effect.fork,
  )
}

export function observe<A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>) {
  return <R, E, E1>(
    stream: Stream<R, E, A, E1>,
  ): Effect.Effect<R2 | R, never, Fiber<E | E1 | E2, void>> =>
    pipe(
      Deferred.make<E | E1 | E2, void>(),
      Effect.flatMap((deferred) =>
        pipe(
          stream.fork(
            Sink.Sink(
              flow(
                f,
                Effect.foldCauseEffect(
                  flow(Effect.failCause, Effect.intoDeferred(deferred), Effect.asUnit),
                  () => Effect.unit,
                ),
              ),
              flow(Effect.failCause, Effect.intoDeferred(deferred), Effect.asUnit),
              pipe(Effect.unit, Effect.intoDeferred(deferred), Effect.asUnit),
            ),
          ),
          Effect.zipRight(deferred.await),
        ),
      ),
      Effect.fork,
    )
}

export function reduce<B, A>(b: B, f: (b: B, a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, B> =>
    Effect.gen(function* ($) {
      const deferred = yield* $(Deferred.make<E | E1, B>())
      const ref = yield* $(Ref.makeRef(() => b))

      yield* $(
        stream.fork<R, E | E1, B>(
          Sink.Sink<E, A, R, E | E1, B>(
            (a) =>
              pipe(
                ref.update((b) => f(b, a)),
                Effect.foldCauseEffect(
                  flow(Effect.failCause, Effect.intoDeferred(deferred), Effect.asUnit),
                  () => Effect.unit,
                ),
              ),
            flow(Effect.failCause, Effect.intoDeferred(deferred), Effect.zipRight(deferred.await)),
            pipe(ref.get, Effect.intoDeferred(deferred), Effect.zipRight(deferred.await)),
          ),
        ),
      )

      return yield* $(deferred.await)
    })
}

export function collectAll<R, E, A, E1>(
  stream: Stream<R, E, A, E1>,
): Effect.Effect<R, E | E1, readonly A[]> {
  return pipe(
    stream,
    reduce([] as readonly A[], (a, b) => a.concat(b)),
  )
}

export function foldMap<B>(I: AssociativeIdentity<B>) {
  return <A>(f: (a: A) => B) =>
    <R, E, E1>(stream: Stream<R, E, A, E1>): Effect.Effect<R, E | E1, B> =>
      pipe(
        stream,
        reduce(I.identity, (b, a) => I.combine(b, f(a))),
      )
}
