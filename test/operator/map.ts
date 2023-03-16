import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import { fromEffect, map, observe } from "@typed/fx"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe(map.name, () => {
    describe("given an Effect that succeeds", () => {
      it("transforms the value", async () => {
        const test = Effect.gen(function*($) {
          const value = yield* $(Random.nextInt())
          const fx = map(fromEffect(Effect.succeed(value)), (x) => x + 1)

          yield* $(
            observe(
              fx,
              (a) =>
                a === value + 1 ?
                  Effect.succeed(undefined) :
                  Effect.fail(`Expected value to be ${value} but got ${value}`)
            )
          )
        })

        await Effect.runPromise(test)
      })
    })
  })
})
