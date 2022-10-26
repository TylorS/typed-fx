import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.mergeAll.name, () => {
    it('merges together emits', async () => {
      const result = await pipe(
        Push.mergeAll([Push.fromIterable([1, 2, 3]), Push.fromIterable([4, 5, 6])]),
        Push.runCollect,
        Effect.scoped,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 2, 3, 4, 5, 6])
    })
  })
})
