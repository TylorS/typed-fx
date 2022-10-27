import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.skipWhile.name, () => {
    it('skips all values until a predicate is reached', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3, 4, 3, 2, 1]),
            Push.skipWhile((x) => x < 4),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [4, 3, 2, 1])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Push.skipUntil.name, () => {
    it('skips values until a predicate is matched', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3, 4, 3, 2, 1]),
            Push.skipUntil((x) => x > 3),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [4, 3, 2, 1])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
