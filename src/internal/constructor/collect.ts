import type { Chunk } from "@effect/data/Chunk"
import type { Option } from "@effect/data/Option"
import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import { fromEffect } from "@typed/fx/internal/constructor/fromEffect"

export const collect: {
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, Option<E>, B>): Fx<R, E, Chunk<B>>
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option<E>, B>): (elements: Iterable<A>) => Fx<R, E, Chunk<B>>
} = dualWithTrace(2, (trace) =>
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect.Effect<R, Option<E>, B>
  ): Fx<R, E, Chunk<B>> =>
    fromEffect(
      Effect.collect(elements, f)
    ).traced(trace))
