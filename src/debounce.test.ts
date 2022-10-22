import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import { debounce } from './debounce.js'
import { from } from './from.js'
import { collectAll } from './reduce.js'

describe(import.meta.url, () => {
  describe('debounce', () => {
    it('favors the latest overlapping event', async () => {
      const test = pipe(from([1, 2, 3]), debounce(millis(100)), collectAll)

      deepStrictEqual(await unsafeRunPromise(test), [3])
    })
  })
})
