import { millis } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { at, fromArray, fromEffect } from "@typed/fx"
import { Cause } from "@typed/fx/internal/_externals"
import { switchMap } from "@typed/fx/internal/operator/switchMap"
import { testCause, testCollectAll } from "@typed/fx/test/util"
import { describe } from "vitest"

describe("operators", () => {
  describe(switchMap.name, () => {
    testCollectAll(
      "allows mapping to other Fx, favoring the latest",
      pipe(
        fromArray([1, 2, 3]),
        switchMap((n) => fromArray([n * 2, n + 1]))
      ),
      [6, 4]
    )

    testCollectAll(
      "allows mapping to other asynchronous Fx, favoring the latest",
      pipe(
        fromArray([1, 2, 3]),
        switchMap((n) => at(n * 2, millis(10)))
      ),
      [6]
    )

    const message = "Expected"

    testCause(
      "fails when a child Fx fails",
      pipe(
        fromArray([1, 2, 3]),
        switchMap(() => fromEffect(Effect.fail(message)))
      ),
      Cause.fail(message)
    )
  })
})
