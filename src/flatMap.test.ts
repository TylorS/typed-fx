import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { flatMap } from './flatMap.js'
import { from } from './from.js'
import { collectAll } from './reduce.js'

describe(import.meta.url, () => {
  describe('flatMap', () => {
    it('chains fx together', async () => {
      const values = [1, 2, 3]
      const test = pipe(
        from(values),
        flatMap((x) => from([x + 1, x + 2])),
      )
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, [2, 3, 3, 4, 4, 5])
    })
  })
})
