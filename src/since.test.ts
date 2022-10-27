import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.since.name, () => {
    it('runs a stream since a signal is emitted to stop', async () => {
      const test = pipe(
        Fx.periodic(millis(10)),
        Fx.scan(0, (x) => x + 1),
        Fx.since(Fx.at(millis(100))(null)),
        Fx.take(5),
        Fx.runCollect,
      )
      const events = await Effect.unsafeRunPromise(test)

      // Effect-ts doesn't have a very deterministic way to deal with ordering of events
      // so we first test what we actually expect, and if that fails, test that it worked, but
      // the timing was slightly off.
      try {
        deepStrictEqual(events, [10, 11, 12, 13, 14])
      } catch (e) {
        deepStrictEqual(events, [9, 10, 11, 12, 13])
      }
    })
  })
})
