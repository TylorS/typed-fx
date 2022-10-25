import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.mergeAll.name, () => {
    it('merges together emits', async () => {
      const result = await pipe(
        Push.mergeAll([Push.fromIterable([1, 2, 3]), Push.fromIterable([4, 5, 6])]),
        Push.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, Chunk.from([1, 2, 3, 4, 5, 6]))
    })
  })
})
