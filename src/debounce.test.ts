import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe('debounce', () => {
    it('favors the latest overlapping event', async () => {
      const test = pipe(
        Push.fromIterable([1, 2, 3]),
        Push.debounce(millis(100)),
        Push.runCollect,
        Effect.scoped,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [3])
    })
  })
})
