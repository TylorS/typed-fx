import { left } from "@effect/data/Either"
import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import { collectAll, fromEffect, gen, observe } from "@typed/fx"
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
})
