import { millis } from "@effect/data/Duration"
import { left } from "@effect/data/Either"
import * as Clock from "@effect/io/Clock"
import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import { at, collectAll, fromArray, fromEffect, gen, observe } from "@typed/fx"
import { fromFxEffect } from "@typed/fx/internal/constructor/fromFxEffect"
import { describe, it } from "vitest"

describe("operators", () => {
  describe(fromEffect.name, () => {
    describe("given an Effect that succeeds", () => {
      it("emits the expected value then ends", async () => {
        const test = Effect.gen(function*($) {
          const value = yield* $(Random.nextInt())
          const fx = fromEffect(Effect.succeed(value))

          yield* $(
            observe(
              fx,
              (a) =>
                a === value ? Effect.succeed(undefined) : Effect.fail(`Expected value to be ${value} but got ${value}`)
            )
          )
        })

        await Effect.runPromise(test)
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const test = Effect.gen(function*($) {
          const fx = fromEffect(Effect.fail(`Expected`))

          yield* $(
            observe(
              fx,
              (a) => Effect.fail(`Unexpected value: ${a}`)
            )
          )
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(left(`Expected`))
      })
    })
  })

  describe(fromFxEffect.name, () => {
    describe("given an Effect that succeeds", () => {
      describe("given the returned Fx succeeds", () => {
        it("emits the expected value then ends", async () => {
          const test = Effect.gen(function*($) {
            const fx = fromFxEffect(Effect.succeed(fromEffect(Effect.succeed(1))))
            const values = yield* $(collectAll(fx))

            expect(values).toEqual([1])
          })

          await Effect.runPromise(test)
        })
      })

      describe("given the returned Fx fails", () => {
        it("emits the expected error", async () => {
          const test = Effect.gen(function*($) {
            const fx = fromFxEffect(Effect.succeed(fromEffect(Effect.fail(`Expected`))))

            yield* $(collectAll(fx))
          })

          const either = await Effect.runPromiseEither(test)

          expect(either).toEqual(left(`Expected`))
        })
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const test = Effect.gen(function*($) {
          const fx = fromFxEffect(Effect.fail(`Expected`))

          yield* $(collectAll(fx))
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(left(`Expected`))
      })
    })
  })

  describe(gen.name, () => {
    describe("given an Effect that succeeds", () => {
      describe("given the returned Fx succeeds", () => {
        it("emits the expected value then ends", async () => {
          const test = Effect.gen(function*($) {
            // eslint-disable-next-line require-yield
            const fx = gen(function*() {
              return fromEffect(Effect.succeed(1))
            })
            const values = yield* $(collectAll(fx))

            expect(values).toEqual([1])
          })

          await Effect.runPromise(test)
        })
      })

      describe("given the returned Fx fails", () => {
        it("emits the expected error", async () => {
          const test = Effect.gen(function*($) {
            // eslint-disable-next-line require-yield
            const fx = gen(function*() {
              return fromEffect(Effect.fail(`Expected`))
            })

            yield* $(collectAll(fx))
          })

          const either = await Effect.runPromiseEither(test)

          expect(either).toEqual(left(`Expected`))
        })
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const test = Effect.gen(function*($) {
          const fx = gen(function*($) {
            yield* $(Effect.fail(`Expected`))

            return fromEffect(Effect.succeed(1))
          })

          yield* $(collectAll(fx))
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(left(`Expected`))
      })
    })
  })

  describe(fromArray.name, () => {
    it("emits the expected values then ends", async () => {
      const test = Effect.gen(function*($) {
        const expected = [1, 2, 3]
        const actual = yield* $(collectAll(fromArray(expected)))

        expect(actual).toEqual(expected)
      })

      await Effect.runPromise(test)
    })
  })

  describe(at.name, () => {
    it("emits the expected value then ends", async () => {
      const test = Effect.gen(function*($) {
        const expected = 1
        const delay = 100
        const start = yield* $(Clock.currentTimeMillis())
        const actual = yield* $(collectAll(at(expected, millis(delay))))
        const end = yield* $(Clock.currentTimeMillis())

        expect(actual).toEqual([expected])
        expect(end - start).toBeGreaterThanOrEqual(delay)
      })

      await Effect.runPromise(test)
    })
  })
})
