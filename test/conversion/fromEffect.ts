import * as Either from "@effect/data/Either"
import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import { fromEffect, observe } from "@typed/fx"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe(fromEffect.name, () => {
    describe("given an Effect that succeeds", () => {
      it("emits the expected value then ends", async () => {
        const test = Effect.gen(function*($) {
          const value = yield* $(Random.nextInt())
          const fx = fromEffect(Effect.succeed(value))

          yield* $(
            observe(
              fx,
              (a) =>
                a === value ? Effect.succeed(undefined) : Effect.fail(`Expected value to be ${value} but got ${value}`)
            )
          )
        })

        await Effect.runPromise(test)
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const test = Effect.gen(function*($) {
          const fx = fromEffect(Effect.fail(`Expected`))

          yield* $(
            observe(
              fx,
              (a) => Effect.fail(`Unexpected value: ${a}`)
            )
          )
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(Either.left(`Expected`))
      })
    })
  })
})
