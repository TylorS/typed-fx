import { millis } from "@effect/data/Duration"
import { periodic } from "@typed/fx/internal/constructor/"
import { take } from "@typed/fx/internal/slicing/take"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(periodic.name, () => {
    testCollectAll("emits undefined periodically forever", take(periodic(millis(10)), 3), [
      undefined,
      undefined,
      undefined
    ])
  })
})
