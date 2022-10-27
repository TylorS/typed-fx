import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.continueWith.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2]),
            Push.continueWith(() => Push.fromIterable([3, 4])),
            Push.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3, 4])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
