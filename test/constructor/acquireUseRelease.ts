import { runCollectAll, succeed } from "@typed/fx"
import { Chunk, Effect } from "@typed/fx/internal/_externals"
import { acquireUseRelease } from "@typed/fx/internal/constructor/acquireUseRelease"

describe(__filename, () => {
  describe(acquireUseRelease.name, () => {
    it("allows using a resource to compute an Fx", async () => {
      const value = { value: Math.random(), released: false }
      const test = runCollectAll(acquireUseRelease(
        Effect.succeed(value),
        ({ value }) => succeed(value),
        (x) => Effect.sync(() => x.released = true)
      ))

      expect(value.released).toBe(false)

      const chunk = await Effect.runPromise(test)

      expect(Chunk.toReadonlyArray(chunk)).toEqual([value.value])
      expect(value.released).toBe(true)
    })
  })
})
