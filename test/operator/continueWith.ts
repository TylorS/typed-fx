import { succeed } from "@typed/fx"
import { continueWith } from "@typed/fx/internal/operator"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(continueWith.name, () => {
    testCollectAll("concatenates Fx", continueWith(succeed(1), () => succeed(2)), [1, 2])
  })
})
