import { millis } from "@effect/data/Duration"
import * as Clock from "@effect/io/Clock"
import * as Effect from "@effect/io/Effect"
import { at, runCollectAll } from "@typed/fx"
import { Chunk } from "@typed/fx/internal/_externals"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe(at.name, () => {
    it("emits the expected value then ends", async () => {
      const test = Effect.gen(function*($) {
        const expected = 1
        const delay = 100
        const start = yield* $(Clock.currentTimeMillis())
        const actual = yield* $(runCollectAll(at(expected, millis(delay))))
        const end = yield* $(Clock.currentTimeMillis())

        expect(Chunk.toReadonlyArray(actual)).toEqual([expected])
        expect(end - start).toBeGreaterThanOrEqual(delay)
      })

      await Effect.runPromise(test)
    })
  })
})
