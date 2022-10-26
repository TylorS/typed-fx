import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.slice.name, () => {
    it('skips/takes values from a Push', async () => {
      const result = await pipe(
        Push.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        Push.slice(3, 4),
        Push.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [4, 5, 6, 7])
    })
  })
})
