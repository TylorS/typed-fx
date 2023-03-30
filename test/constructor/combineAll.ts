import { succeed } from "@typed/fx"
import { combineAll } from "@typed/fx/internal/constructor/combineAll"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(combineAll.name, () => {
    testCollectAll(
      "collects all values in a chunk",
      combineAll(
        [
          succeed(1),
          succeed(2),
          succeed(3)
        ]
      ),
      [
        [1, 2, 3]
      ]
    )
  })
})
