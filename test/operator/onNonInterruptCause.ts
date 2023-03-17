import { succeed } from "@typed/fx"
import { Effect } from "@typed/fx/internal/_externals"
import { onNonInterruptCause } from "@typed/fx/internal/error"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(onNonInterruptCause.name, () => {
    describe("given a Fx that succeeds", () => {
      testCollectAll(
        "returns the value",
        onNonInterruptCause(succeed(1), () => Effect.succeed(2)),
        [1]
      )
    })
  })
})
