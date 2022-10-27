import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.until.name, () => {
    it('runs a stream until a signal is emitted to stop', async () => {
      const test = pipe(Fx.periodic(millis(20)), Fx.until(Fx.at(millis(200))(null)), Fx.runCollect)
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events.length, 9)
    })
  })
})
