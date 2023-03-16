import { Chunk, Effect, Fiber } from "@typed/fx/internal/_externals"
import { runCollectAll } from "@typed/fx/internal/run/runCollectAll"
import { makeSubject } from "@typed/fx/internal/subject/Subject"
import { deepStrictEqual } from "assert"
import { describe, it } from "vitest"

describe(__filename, () => {
  describe("Subject", () => {
    it("is a imperatively used Fx", async () => {
      const test = Effect.gen(function*($) {
        const subject = yield* $(makeSubject<never, number>())
        const fiber = yield* $(Effect.fork(runCollectAll(subject)))

        // Allow fiber to start
        yield* $(Effect.yieldNow())

        yield* $(subject.event(1))
        yield* $(subject.event(2))
        yield* $(subject.event(3))
        yield* $(subject.end())

        const result = yield* $(Fiber.join(fiber))

        deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2, 3])
      })

      await Effect.runPromise(test)
    })
  })
})
