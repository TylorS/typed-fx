import { deepStrictEqual, ok } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe('delay', () => {
    it('adds a delay to an event', async () => {
      const start = performance.now()
      const value = Math.random()
      const delayMs = 100
      const test = Push.at(Duration.millis(delayMs))(value)
      const events = await pipe(test, Push.runCollect, Effect.unsafeRunPromise)
      const end = performance.now()

      ok(end - start >= delayMs)

      deepStrictEqual(events, [value])
    })
  })
})
