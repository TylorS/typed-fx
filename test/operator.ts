import { millis } from "@effect/data/Duration"
import { left } from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import { range } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Random from "@effect/io/Random"
import {
  at,
  collectAll,
  delay,
  flatMap,
  fromArray,
  fromEffect,
  hold,
  map,
  merge,
  mergeAll,
  multicast,
  observe,
  suspendSucceed
} from "@typed/fx"
import { describe, it } from "vitest"

describe("operators", () => {
  describe(map.name, () => {
    describe("given an Effect that succeeds", () => {
      it("transforms the value", async () => {
        const test = Effect.gen(function*($) {
          const value = yield* $(Random.nextInt())
          const fx = map(fromEffect(Effect.succeed(value)), (x) => x + 1)

          yield* $(
            observe(
              fx,
              (a) =>
                a === value + 1 ?
                  Effect.succeed(undefined) :
                  Effect.fail(`Expected value to be ${value} but got ${value}`)
            )
          )
        })

        await Effect.runPromise(test)
      })
    })

    describe("given an Effect that fails", () => {
      it("doesn't run the transormation", async () => {
        const test = Effect.gen(function*($) {
          const runs = 0
          const run = () => runs + 1
          const fx = map(fromEffect(Effect.fail(`Expected`)), run)

          yield* $(
            observe(
              fx,
              (a) => Effect.fail(`Unexpected value: ${a}`)
            )
          )

          expect(runs).toEqual(0)
        })

        const either = await Effect.runPromiseEither(test)

        expect(either).toEqual(left(`Expected`))
      })
    })
  })

  describe(flatMap.name, () => {
    it("allows mapping to other Fx", async () => {
      const test = pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => fromArray([n * 2, n + 1])),
        collectAll
      )
      const events = await Effect.runPromise(test)

      expect(events).toEqual([2, 2, 4, 3, 6, 4])
    })

    it("allows mapping to other asynchronous Fx", async () => {
      const test = pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => at(n * 2, millis(10))),
        collectAll
      )
      const events = await Effect.runPromise(test)

      expect(events).toEqual([2, 4, 6])
    })

    it("fails when a child Fx fails", async () => {
      const test = pipe(
        fromArray([1, 2, 3]),
        flatMap((n) => n === 2 ? fromEffect(Effect.fail("Expected")) : fromArray([n * 2, n + 1])),
        collectAll
      )
      const either = await Effect.runPromiseEither(test)

      expect(either).toEqual(left("Expected"))
    })
  })

  describe(multicast.name, () => {
    it("allows sharing the underlying producer of a stream", async () => {
      const values = [1, 2, 3]
      let started = 0

      const test = Effect.gen(function*($) {
        const stream = multicast(
          suspendSucceed(() => {
            started++
            return pipe(
              fromArray(values),
              flatMap((a) =>
                pipe(
                  fromArray([a, a + 1]),
                  merge(pipe(fromArray([a * a, a ** a]), delay(millis(50))))
                )
              )
            )
          })
        )

        const fiber1 = yield* $(Effect.fork(collectAll(stream)))
        const fiber2 = yield* $(Effect.fork(collectAll(stream)))

        const events1 = yield* $(Fiber.join(fiber1))
        const events2 = yield* $(Fiber.join(fiber2))

        expect(events1).toEqual([
          1,
          1 + 1,
          2,
          2 + 1,
          3,
          3 + 1,
          1 * 1,
          2 * 2,
          3 * 3,
          1 ** 1,
          2 ** 2,
          3 ** 3
        ])

        expect(events1).toEqual(events2)

        expect(started).toEqual(1)
      })

      await Effect.runPromise(test)
    })
  })

  describe(hold.name, () => {
    it("allows replaying latest events to late subscribers", async () => {
      const test = Effect.gen(function*($) {
        const stream = hold(
          mergeAll(
            ...range(0, 5).map((n) => at(n + 1, millis(n * 100)))
          )
        )

        const fiber1 = yield* $(Effect.fork(collectAll(stream)))

        yield* $(Effect.sleep(millis(75)))

        const fiber2 = yield* $(Effect.fork(collectAll(stream)))

        yield* $(Effect.sleep(millis(75)))

        const fiber3 = yield* $(Effect.fork(collectAll(stream)))

        expect(yield* $(Fiber.join(fiber1))).toEqual([1, 2, 3, 4, 5, 6])
        expect(yield* $(Fiber.join(fiber2))).toEqual([1, 2, 3, 4, 5, 6])
        expect(yield* $(Fiber.join(fiber3))).toEqual([2, 3, 4, 5, 6])
      })

      await Effect.runPromise(test)
    })
  })
})
