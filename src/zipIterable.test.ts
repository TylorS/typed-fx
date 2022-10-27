import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe('zip', () => {
    it('zips 2 fx together', async () => {
      const values = [1, 2, 3]
      const test = pipe(Push.periodic(Duration.millis(10)), Push.withIterable(values))
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, values)
    })
  })
})
