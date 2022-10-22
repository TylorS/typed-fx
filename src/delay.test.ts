import { deepStrictEqual, ok } from 'assert'

import { unsafeRunPromise } from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import { at } from './delay.js'
import { collectAll } from './reduce.js'

describe(import.meta.url, () => {
  describe('delay', () => {
    it('adds a delay to an event', async () => {
      const value = Math.random()
      const delayMs = 10
      const test = at(Duration.millis(delayMs))(value)
      const start = performance.now()
      const events = await pipe(test, collectAll, unsafeRunPromise)
      const end = performance.now()

      ok(end - start >= delayMs)

      deepStrictEqual(events, [value])
    })
  })
})
