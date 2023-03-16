import { mergeAll, succeed } from "@typed/fx"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(mergeAll.name, () => {
    testCollectAll(
      "merges all fx",
      mergeAll(succeed(1), succeed(2), succeed(3)),
      [1, 2, 3]
    )
  })
})
