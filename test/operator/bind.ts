import { pipe } from "@effect/data/Function"
import { succeed } from "@typed/fx"
import { bind } from "@typed/fx/internal/do"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(bind.name, () => {
    testCollectAll(
      "binds the value to the Fx",
      pipe(succeed({}), bind("a", () => succeed(1))),
      [{ a: 1 }]
    )
  })
})
