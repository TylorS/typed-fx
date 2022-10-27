import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.snapshot.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3]),
            Fx.delay(Duration.millis(10)),
            Fx.snapshot(Fx.succeed(10), (x, y) => x * y),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [10, 20, 30])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Fx.sample.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3]),
            Fx.delay(Duration.millis(10)),
            Fx.sample(Fx.succeed(1)),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [
          [1, 1],
          [2, 1],
          [3, 1],
        ])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
