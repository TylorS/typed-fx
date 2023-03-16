import { fromArray } from "@typed/fx"
import { Chunk, Effect } from "@typed/fx/internal/_externals"
import { runCollectAll } from "@typed/fx/internal/run"

describe(__filename, () => {
  describe(fromArray.name, () => {
    it("creates an Fx from an Array", async () => {
      const test = runCollectAll(fromArray([1, 2, 3]))

      expect(await Effect.runPromise(test)).toEqual(Chunk.unsafeFromArray([1, 2, 3]))
    })
  })
})
