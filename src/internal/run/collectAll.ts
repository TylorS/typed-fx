import * as Effect from "@effect/io/Effect"
import type { Fx } from "@typed/fx/Fx"
import { observe } from "./observe"

export function collectAll<R, E, A>(fx: Fx<R, E, A>): Effect.Effect<R, E, ReadonlyArray<A>> {
  return Effect.gen(function*($) {
    const values: Array<A> = []

    yield* $(observe(fx, (a) => Effect.sync(() => values.push(a))))

    return values
  })
}
