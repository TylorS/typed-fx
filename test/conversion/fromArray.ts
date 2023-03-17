import { fromArray } from "@typed/fx"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(fromArray.name, () => {
    testCollectAll("creates an Fx from an Array", fromArray([1, 2, 3]), [1, 2, 3])
  })
})
