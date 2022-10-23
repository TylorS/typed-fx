import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Fx } from './Fx.js'
import { Sink } from './Sink.js'
import { refCountDeferred, tupleRef } from './_internal.js'

export function zip<R2, E2, B, E3>(other: Fx<R2, E2, B, E3>) {
  return <R, E, A, E1>(self: Fx<R, E, A, E1>): Fx<R | R2, E | E2, readonly [A, B], E1 | E3> =>
    zipAll([self, other])
}

export function zipAll<FX extends ReadonlyArray<Fx<any, any, any, any>>>(
  fx: readonly [...FX],
): Fx<
  Fx.ResourcesOf<FX[number]>,
  Fx.ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: Fx.OutputOf<FX[K]> },
  Fx.ReturnErrorsOf<FX[number]>
>

export function zipAll<R2, E2, B, E3>(
  fx: Iterable<Fx<R2, E2, B, E3>>,
): Fx<R2, E2, ReadonlyArray<B>, E3>

export function zipAll<R2, E2, B, E3>(
  fx: Iterable<Fx<R2, E2, B, E3>>,
): Fx<R2, E2, ReadonlyArray<B>, E3> {
  return Fx(<R4, E4, C>(sink: Sink<E2, ReadonlyArray<B>, R4, E4, C>) =>
    Effect.gen(function* ($) {
      const array = Array.from(fx)
      const deferred = yield* $(refCountDeferred<E3 | E4, C>(true, array.length))
      const refs = Array.from(
        yield* $(Effect.forEach(array, () => Ref.makeRef<Maybe.Maybe<B>>(() => Maybe.none))),
      )
      const ref = tupleRef(refs)

      const emitIfReady = pipe(
        ref.get,
        Effect.map((as) => as.filter(Maybe.isSome).map((x) => x.value)),
        Effect.flatMap((bs) =>
          bs.length === array.length
            ? pipe(
                sink.event(bs),
                Effect.flatMap(() => ref.set(Array(array.length).fill(Maybe.none))),
              )
            : Effect.unit,
        ),
      )

      yield* $(
        Effect.forEachWithIndex(array, (fx, i) =>
          Effect.fork(
            fx.run(
              Sink(
                (a) => pipe(refs[i].set(Maybe.some(a)), Effect.zipRight(emitIfReady)),
                flow(sink.error, deferred.error),
                pipe(
                  deferred.decrement,
                  Effect.flatMap(() => deferred.endIfComplete(sink.end)),
                ),
              ),
            ),
          ),
        ),
      )

      return yield* $(deferred.await)
    }),
  )
}
