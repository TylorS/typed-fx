import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.withIterable.name, () => {
    it('zips fx with an iterable', async () => {
      const values = [1, 2, 3]
      const test = pipe(Fx.periodic(Duration.millis(10)), Fx.withIterable(values))
      const events = await pipe(test, Fx.runCollect, Effect.unsafeRunPromise)

      deepStrictEqual(events, values)
    })
  })
})
