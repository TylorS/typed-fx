import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.throttle.name, () => {
    it('favors the first overlapping event', async () => {
      const test = pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.throttle(Duration.millis(100)),
        Fx.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [1])
    })
  })
})
