import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.snapshot.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3]),
            Push.delay(Duration.millis(10)),
            Push.snapshot(Push.succeed(10), (x, y) => x * y),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [10, 20, 30])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Push.sample.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3]),
            Push.delay(Duration.millis(10)),
            Push.sample(Push.succeed(1)),
            Push.runCollect,
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
