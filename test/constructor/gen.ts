import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import { fromEffect, gen } from "@typed/fx"
import { testCause, testCollectAll } from "@typed/fx/test/util"
import { describe } from "vitest"

describe(__filename, () => {
  describe(gen.name, () => {
    describe("given an Effect that succeeds", () => {
      describe("given the returned Fx succeeds", () => {
        testCollectAll(
          "emits the expected value then ends",
          // eslint-disable-next-line require-yield
          gen(function*() {
            return fromEffect(Effect.succeed(1))
          }),
          [1]
        )
      })

      describe("given the returned Fx fails", () => {
        testCause(
          "emits the expected error", // eslint-disable-next-line require-yield
          gen(function*() {
            return fromEffect(Effect.fail(`Expected`))
          }),
          Cause.fail(`Expected`)
        )
      })
    })

    describe("given an Effect that fails", () => {
      testCause(
        "emits the expected error",
        gen(function*($) {
          yield* $(Effect.fail(`Expected`))

          return fromEffect(Effect.succeed(1))
        }),
        Cause.fail(`Expected`)
      )
    })
  })
})
