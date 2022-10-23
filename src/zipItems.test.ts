import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { periodic } from './periodic.js'
import { collectAll } from './reduce.js'
import { withItems } from './zipItems.js'

describe(import.meta.url, () => {
  describe('withItems', () => {
    it('zips together an Fx with an Array', async () => {
      const values = [1, 2, 3]
      const test = pipe(periodic(Duration.millis(10)), withItems(values))
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events, values)
    })
  })
})
