import { succeed } from "@typed/fx"
import { Effect, Fiber } from "@typed/fx/internal/_externals"

describe(__filename, () => {
  describe("Fx", () => {
    it("extends Effect", async () => {
      const test = Effect.scoped(Effect.gen(function*($) {
        yield* $(succeed(1))
        const fiber = yield* $(succeed(2).fork)

        yield* $(Fiber.join(fiber))
      }))

      await Effect.runPromise(test)
    })
  })
})
