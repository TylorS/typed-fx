import { millis } from "@effect/data/Duration"
import { delay, succeed } from "@typed/fx"
import { Chunk, Effect } from "@typed/fx/internal/_externals"
import { runCollectAll } from "@typed/fx/internal/run"

describe(__filename, () => {
  describe(delay.name, () => {
    it("delays the value by the given amount of time", async () => {
      const test = Effect.gen(function*($) {
        const ms = 100
        const iterations = 100

        for (let i = 0; i < iterations; ++i) {
          const [duration, values] = yield* $(Effect.timed(runCollectAll(succeed(1))))

          expect(values).toEqual(Chunk.unsafeFromArray([1]))
          expect(duration.millis).toBeLessThan(ms)
        }

        const [delayedDuration, delayedValues] = yield* $(Effect.timed(runCollectAll(delay(succeed(1), millis(ms)))))

        expect(delayedDuration.millis).toBeGreaterThanOrEqual(ms)
        expect(delayedValues).toEqual(Chunk.unsafeFromArray([1]))
      })

      await Effect.runPromise(test)
    })
  })
})
