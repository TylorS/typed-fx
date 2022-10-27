import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.takeWhile.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3, 4, 5, 6, 7]),
            Push.takeWhile((x) => x < 4),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Push.takeUntil.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3, 4, 5, 6, 7]),
            Push.takeUntil((x) => x > 3),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
