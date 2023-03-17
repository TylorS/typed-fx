import { Cause, Effect } from "@typed/fx/internal/_externals"
import { fromEmitter } from "@typed/fx/internal/conversion"
import { testCause, testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(fromEmitter.name, () => {
    testCollectAll(
      "converts imperative code to an Fx",
      fromEmitter<never, number>((emitter) =>
        Effect.sync(() => {
          emitter.event(1)
          emitter.event(2)
          emitter.event(3)
          emitter.end()
        })
      ),
      [1, 2, 3]
    )

    const failure = Cause.fail("error")

    testCause(
      "converts imperative code to an Fx",
      fromEmitter<string, number>((emitter) => Effect.sync(() => emitter.error(failure))),
      failure
    )
  })
})
