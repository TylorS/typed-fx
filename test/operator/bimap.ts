import { Cause } from "@typed/fx/internal/_externals"
import * as constructor from "@typed/fx/internal/constructor"
import * as operator from "@typed/fx/internal/operator"
import { testCause, testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(operator.bimap.name, () => {
    const bimap_ = operator.bimap((x: number) => x * 2, (x: number) => x + 1)

    describe("given an Fx that succeeds", () => {
      testCollectAll("transforms the value", bimap_(constructor.succeed(1)), [2])
    })

    describe("given an Fx that fails", () => {
      testCause("transforms the error", bimap_(constructor.fail(1)), Cause.fail(2))
    })
  })
})
