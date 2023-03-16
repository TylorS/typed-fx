import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { Chunk } from "@typed/fx/internal/_externals"
import { observe } from "./observe"

export const runCollectAll = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, Chunk.Chunk<A>> =>
    Effect.gen(function*($) {
      let values: Chunk.Chunk<A> = Chunk.empty()

      yield* $(observe(fx, (a) => Effect.sync(() => values = Chunk.append(values, a))))

      return values
    }).traced(trace)
)
