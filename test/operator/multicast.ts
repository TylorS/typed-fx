import { millis } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import { delay, flatMap, fromArray, merge, multicast, suspend } from "@typed/fx"
import { Chunk } from "@typed/fx/internal/_externals"
import { toChunk } from "@typed/fx/internal/run"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe(multicast.name, () => {
    it("allows sharing the underlying producer of a stream", async () => {
      const values = [1, 2, 3]
      let started = 0

      const test = Effect.gen(function*($) {
        const stream = multicast(
          suspend(() => {
            started++

            return pipe(
              fromArray(values),
              flatMap((a) =>
                pipe(
                  fromArray([a, a + 1]),
                  merge(pipe(fromArray([a * a, a ** a]), delay(millis(100))))
                )
              )
            )
          })
        )

        const fiber1 = yield* $(Effect.fork(toChunk(stream)))
        const fiber2 = yield* $(Effect.fork(toChunk(stream)))

        const events1 = Chunk.toReadonlyArray(yield* $(Fiber.join(fiber1)))
        const events2 = Chunk.toReadonlyArray(yield* $(Fiber.join(fiber2)))

        const expected = [
          values[0],
          values[1],
          values[2],
          values[0] + 1,
          values[1] + 1,
          values[2] + 1,
          values[0] * values[0],
          values[1] * values[1],
          values[2] * values[2],
          values[0] ** values[0],
          values[1] ** values[1],
          values[2] ** values[2]
        ]

        expect(events1).toEqual(expected)

        expect(events1).toEqual(events2)

        expect(started).toEqual(1)
      })

      await Effect.runPromise(test)
    })
  })
})
