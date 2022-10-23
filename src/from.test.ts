import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'

import { from } from './from.js'
import { collectAll } from './reduce.js'

describe(import.meta.url, () => {
  describe('from', () => {
    it('converts a collection into a fx', async () => {
      const values = [1, 2, 3]
      const test = collectAll(from(values))
      const events = await unsafeRunPromise(test)

      deepStrictEqual(events, values)
    })
  })
})
