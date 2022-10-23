import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'

import { from } from './from.js'
import { collectAll } from './reduce.js'
import { slice } from './slice.js'

describe(import.meta.url, () => {
  describe('slice', () => {
    it('skips and takes a set amount of values', async () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const test = collectAll(slice(2, 4)(from(values)))
      const events = await unsafeRunPromise(test)

      deepStrictEqual(events, [3, 4, 5, 6])
    })
  })
})
