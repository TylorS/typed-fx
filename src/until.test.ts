import { deepStrictEqual } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { at } from './delay.js'
import { periodic } from './periodic.js'
import { collectAll } from './reduce.js'
import { until } from './until.js'

describe(import.meta.url, () => {
  describe('until', () => {
    it('adds a delay to an event', async () => {
      const value = Math.random()
      const end = at(Duration.millis(200))(value)
      const stream = periodic(Duration.millis(50))
      const test = until(end)(stream)
      const events = await pipe(test, collectAll, unsafeRunPromise)

      deepStrictEqual(events.length, 3)
    })
  })
})
