import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { reduce } from './drain.js'
import { from } from './from.js'

describe(import.meta.url, () => {
  describe('from', () => {
    it('converts collections into a Stream', async () => {
      const effect = pipe(
        from([1, 2, 3]),
        reduce(0, (a, b) => a + b),
      )

      deepStrictEqual(await unsafeRunPromise(effect), 6)
    })
  })
})
