import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import { fromEffect, runCollectAll } from "@typed/fx"
import { fromFxEffect } from "@typed/fx/internal/constructor/fromFxEffect"
import { testCause, testCollectAll } from "@typed/fx/test/util"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe(fromFxEffect.name, () => {
    describe("given an Effect that succeeds", () => {
      describe("given the returned Fx succeeds", () => {
        testCollectAll(
          "emits the expected value then ends",
          fromFxEffect(Effect.succeed(fromEffect(Effect.succeed(1)))),
          [1]
        )
      })

      describe("given the returned Fx fails", () => {
        const message = "Expected"

        testCause(
          "emits expected error",
          fromFxEffect(Effect.succeed(fromEffect(Effect.fail(`Expected`)))),
          Cause.fail(message)
        )
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const message = `Expected`
        const test = runCollectAll(fromFxEffect(Effect.fail(message)))
        const exit = await Effect.runPromiseExit(test)

        assert(Exit.isFailure(exit))
        expect(Cause.unannotate(exit.cause)).toEqual(Cause.fail(message))

        const pretty = Cause.pretty(exit.cause)

        expect(pretty).toMatch(/Error: Expected/)
        expect(pretty).toMatch(/\.fail/)
        expect(pretty).toMatch(/\.fromFxEffect/)
        expect(pretty).toMatch(/\.runCollectAll/)
        expect(pretty).toMatch(/\.runPromiseExit/)
      })
    })
  })
})
