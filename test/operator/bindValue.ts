import { pipe } from "@effect/data/Function"
import { succeed } from "@typed/fx"
import { bindValue } from "@typed/fx/internal/operator"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(bindValue.name, () => {
    testCollectAll(
      "binds the value to the Fx",
      pipe(succeed({}), bindValue("a", () => 1)),
      [{ a: 1 }]
    )
  })
})
