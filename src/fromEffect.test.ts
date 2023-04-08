import { Cause, Effect } from "@typed/fx/externals"
import { fromEffect } from "@typed/fx/fromEffect"
import { testCause, testCollectAll } from "@typed/fx/test-utils"

describe(__filename, () => {
  describe(fromEffect.name, (): void => {
    const value = Math.random()

    testCollectAll("returns the output", fromEffect(Effect.succeed(value)), [value])

    testCause("fails with the given Cause", fromEffect(Effect.fail(value)), Cause.fail(value))
  })
})
