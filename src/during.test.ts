import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.during.name, () => {
    it('runs a stream during a signal is emitted to stop', async () => {
      const test = pipe(
        Fx.periodic(millis(10)),
        Fx.scan(0, (x) => x + 1),
        Fx.during(Fx.at(millis(50))(Fx.at(millis(55))(null))),
        Fx.runCollect,
      )
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [5, 6, 7, 8, 9])
    })
  })
})
