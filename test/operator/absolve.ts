import { identity } from "@effect/data/Function"
import { fail } from "@typed/fx"
import { Cause } from "@typed/fx/internal/_externals"
import { absorbWith } from "@typed/fx/internal/error"
import { testCause } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(absorbWith.name, () => {
    testCause("flattens an Either", absorbWith(fail(1), identity), Cause.fail(1))
  })
})
