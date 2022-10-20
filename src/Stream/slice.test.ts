import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Stream from './index.js'

describe(import.meta.url, () => {
  describe('slice', () => {
    it('allows controlling how many values to skip and take', async () => {
      const stream = pipe(Stream.from([1, 2, 3, 4, 5]), Stream.slice(1, 3))
      const result = await unsafeRunPromise(Stream.collectAll(stream))

      deepStrictEqual(result, [2, 3, 4])
    })
  })
})
