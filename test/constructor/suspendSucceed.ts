import { succeed, suspendSucceed } from "@typed/fx"
import { Cause } from "@typed/fx/internal/_externals"
import { testCause, testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(suspendSucceed.name, () => {
    describe("given a lazy Fx that succeeds", () => {
      testCollectAll("lazily creates an Fx", suspendSucceed(() => succeed(1)), [1])
    })

    describe("given a lazy Fx that fails", () => {
      const error = new Error("Expected")

      testCause(
        "lazily creates an Fx that fails",
        suspendSucceed(() => {
          throw error

          return succeed(1)
        }),
        Cause.die(error)
      )
    })
  })
})
