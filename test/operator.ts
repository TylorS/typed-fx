import { left } from "@effect/data/Either"
import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import { fromEffect, map, observe } from "@typed/fx"
import { describe, it } from "vitest"

describe("operators", () => {
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

    describe("given an Effect that fails", () => {
      it("doesn't run the transormation", async () => {
        const test = Effect.gen(function*($) {
          const runs = 0
          const run = () => runs + 1
          const fx = map(fromEffect(Effect.fail(`Expected`)), run)

          yield* $(
            observe(
              fx,
              (a) => Effect.fail(`Unexpected value: ${a}`)
            )
          )

          expect(runs).toEqual(0)
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(left(`Expected`))
      })
    })
  })
})
