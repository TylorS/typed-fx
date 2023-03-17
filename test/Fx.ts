import { succeed } from "@typed/fx"
import { Effect, Fiber } from "@typed/fx/internal/_externals"

describe(__filename, () => {
  describe("Fx", () => {
    it("extends Effect", async () => {
      const test = Effect.scoped(Effect.gen(function*($) {
        const values: Array<number> = []

        yield* $(succeed(1).observe((value) => Effect.succeed(values.push(value))))
        const fiber = yield* $(succeed(2).forkObserve((value) => Effect.succeed(values.push(value))))

        yield* $(Fiber.join(fiber))
      }))

      await Effect.runPromise(test)
    })
  })
})
