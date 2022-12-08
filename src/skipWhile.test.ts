import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.skipWhile.name, () => {
    it('skips all values until a predicate is reached', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3, 4, 3, 2, 1]),
            Fx.skipWhile((x) => x < 4),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [4, 3, 2, 1])
      })

      await Effect.unsafeRunPromise(test)
    })
  })

  describe(Fx.skipUntil.name, () => {
    it('skips values until a predicate is matched', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3, 4, 3, 2, 1]),
            Fx.skipUntil((x) => x > 3),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [4, 3, 2, 1])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
