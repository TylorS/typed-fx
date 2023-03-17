import { succeedRight } from "@typed/fx/internal/constructor/succeedRight"
import { absolve, absorbWith } from "@typed/fx/internal/error"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(absorbWith.name, () => {
    testCollectAll("flattens an Either", absolve(succeedRight(1)), [1])
  })
})
