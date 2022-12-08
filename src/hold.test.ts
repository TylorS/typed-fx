import { deepStrictEqual } from 'assert'

import { Duration, Effect, Fiber, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('hold', () => {
    it('emits values to late observers', async () => {
      const value = Math.random()

      let started = 0
      const fx = pipe(
        Fx.fromEffect(Effect.sync(() => started++)),
        Fx.flatMap(() =>
          Fx.mergeAll([
            Fx.at(Duration.millis(0))(value),
            Fx.at(Duration.millis(100))(value + 1),
            Fx.at(Duration.millis(200))(value + 2),
          ]),
        ),
        Fx.hold,
      )

      const test = Effect.gen(function* ($) {
        const a = yield* $(Effect.fork(Fx.runCollect(fx)))

        yield* $(Effect.sleep(Duration.millis(50)))

        const b = yield* $(Effect.fork(Fx.runCollect(fx)))

        yield* $(Effect.sleep(Duration.millis(100)))

        const c = yield* $(Effect.fork(Fx.runCollect(fx)))

        deepStrictEqual(yield* $(Fiber.join(a)), [value, value + 1, value + 2])
        deepStrictEqual(yield* $(Fiber.join(b)), [value, value + 1, value + 2])
        deepStrictEqual(yield* $(Fiber.join(c)), [value + 1, value + 2])

        deepStrictEqual(started, 1)
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
