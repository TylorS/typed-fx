import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { observe } from "./observe"

export const collectAll = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, ReadonlyArray<A>> =>
    Effect.gen(function*($) {
      const values: Array<A> = []

      yield* $(observe(fx, (a) => Effect.sync(() => values.push(a))))

      return values
    }).traced(trace)
)
