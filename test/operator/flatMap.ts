import { millis } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { at, flatMap, fromArray, fromEffect } from "@typed/fx"
import { Cause } from "@typed/fx/internal/_externals"
import { testCause, testCollectAll } from "@typed/fx/test/util"
import { describe } from "vitest"

describe("operators", () => {
  describe(flatMap.name, () => {
    testCollectAll(
      "allows mapping to other Fx",
      pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => fromArray([n * 2, n + 1]))
      ),
      [2, 2, 4, 3, 6, 4]
    )

    testCollectAll(
      "allows mapping to other asynchronous Fx",
      pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => at(n * 2, millis(10)))
      ),
      [2, 4, 6]
    )

    testCause(
      "fails when a child Fx fails",
      pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => n === 2 ? fromEffect(Effect.fail("Expected")) : fromArray([n * 2, n + 1]))
      ),
      Cause.fail("Expected")
    )
  })
})
