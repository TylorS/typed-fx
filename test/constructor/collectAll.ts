import { succeed } from "@typed/fx"
import { Chunk } from "@typed/fx/internal/_externals"
import { collectAll } from "@typed/fx/internal/constructor/collectAll"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(collectAll.name, () => {
    testCollectAll(
      "collects all values in a chunk",
      collectAll(
        [
          succeed(1),
          succeed(2),
          succeed(3)
        ]
      ),
      [
        Chunk.unsafeFromArray([1, 2, 3])
      ]
    )
  })
})
