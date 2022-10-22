import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import { from } from './from.js'
import { collectAll } from './reduce.js'
import { throttle } from './throttle.js'

describe(import.meta.url, () => {
  describe('throttle', () => {
    it('favors the first overlapping event', async () => {
      const test = pipe(from([1, 2, 3]), throttle(millis(100)), collectAll)

      deepStrictEqual(await unsafeRunPromise(test), [1])
    })
  })
})
