import { millis } from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
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

        expect(either).toEqual(Either.left(`Expected`))
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

          expect(either).toEqual(Either.left(`Expected`))
        })
      })
    })

    describe("given an Effect that fails", () => {
      it("emits the expected error", async () => {
        const message = `Expected`
        const test = collectAll(fromFxEffect(Effect.fail(message)))
        const exit = await Effect.runPromiseExit(test)

        assert(Exit.isFailure(exit))
        expect(Cause.unannotate(exit.cause)).toEqual(Cause.fail(message))

        const pretty = Cause.pretty(exit.cause)

        expect(pretty).toMatch(/Error: Expected/)
        expect(pretty).toMatch(/\.fail/)
        expect(pretty).toMatch(/\.fromFxEffect/)
        expect(pretty).toMatch(/\.collectAll/)
        expect(pretty).toMatch(/\.runPromiseExit/)
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

          expect(either).toEqual(Either.left(`Expected`))
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

        expect(either).toEqual(Either.left(`Expected`))
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
