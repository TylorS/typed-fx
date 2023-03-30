import { millis } from "@effect/data/Duration"
import { Effect, Schedule } from "@typed/fx/internal/_externals"
import { schedule } from "@typed/fx/internal/constructor/"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(schedule.name, () => {
    let i = 0
    testCollectAll(
      "collects all values in a chunk",
      schedule(
        Effect.sync(() => ++i),
        Schedule.fromDelay(millis(10))
      ),
      [
        1
      ]
    )
  })
})
