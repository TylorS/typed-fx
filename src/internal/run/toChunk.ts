import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { Chunk } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"
import { observe } from "./observe"

export const toChunk: <R, E, A>(fx: Fx<R, E, A>) => Effect.Effect<R, E, Chunk.Chunk<A>> = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, Chunk.Chunk<A>> =>
    Effect.gen(function*($) {
      let values: Chunk.Chunk<A> = Chunk.empty()

      yield* $(observe(fx, (a) => Effect.sync(() => values = Chunk.append(values, a))))

      return values
    }).traced(trace)
)
