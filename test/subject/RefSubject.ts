import { Effect, Option } from "@typed/fx/internal/_externals"
import { makeRef } from "@typed/fx/internal/subject/RefSubject"
import { deepStrictEqual } from "assert"
import { describe, it } from "vitest"

describe("RefSubject", () => {
  describe("get", () => {
    it("lazily instantiates the value", async () => {
      const test = Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))
        const value = yield* $(ref.get)

        deepStrictEqual(value, 1)
      })

      await Effect.runPromise(test)
    })
  })

  describe("modifyEffect", () => {
    it("allows modifying the value with an Effect", async () => {
      const test = Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        deepStrictEqual(yield* $(ref.modifyEffect((a) => Effect.succeed([null, a + 1]))), null)
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(test)
    })
  })

  describe("modify", () => {
    it("allows modifying the value", async () => {
      const test = Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        deepStrictEqual(yield* $(ref.modify((a) => [null, a + 1])), null)
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(test)
    })
  })

  describe("set", () => {
    it("allows setting the value", async () => {
      const test = Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        yield* $(ref.set(2))
        deepStrictEqual(yield* $(ref.get), 2)
      })

      await Effect.runPromise(test)
    })
  })

  describe("delete", () => {
    it("allows deleting the value", async () => {
      const test = Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))

        // If the value has not be initialized, it will be return None
        deepStrictEqual(yield* $(ref.delete), Option.none())

        // Initialize the value
        deepStrictEqual(yield* $(ref.get), 1)

        // Delete the value, returning the previously set value
        deepStrictEqual(yield* $(ref.delete), Option.some(1))
      })

      await Effect.runPromise(test)
    })
  })

  describe("map", () => {
    it("computes the value from another ref", async () => {
      const test = Effect.scoped(Effect.gen(function*($) {
        const ref = yield* $(makeRef(Effect.succeed(1)))
        const computed = yield* $(ref.map((a) => a + 1))

        deepStrictEqual(yield* $(computed.get), 2)
        deepStrictEqual(yield* $(ref.set(2)), 2)
        deepStrictEqual(yield* $(computed.get), 3)
      }))

      await Effect.runPromise(test)
    })
  })

  describe("Computed", () => {
    describe("map", () => {
      it("computes the value from another Computed", async () => {
        const test = Effect.scoped(Effect.gen(function*($) {
          const ref = yield* $(makeRef(Effect.succeed(1)))
          const addOne = yield* $(ref.map((a) => a + 1))
          const multiplyTwo = yield* $(addOne.map((a) => a * 2))

          // Initial
          deepStrictEqual(yield* $(addOne.get), 2)
          deepStrictEqual(yield* $(multiplyTwo.get), 4)

          // Update ref value
          deepStrictEqual(yield* $(ref.set(2)), 2)
          deepStrictEqual(yield* $(addOne.get), 3)
          deepStrictEqual(yield* $(multiplyTwo.get), 6)
        }))

        await Effect.runPromise(test)
      })
    })
  })
})
