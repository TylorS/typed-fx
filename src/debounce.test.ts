import { deepStrictEqual } from 'assert'

import { Duration, Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('debounce', () => {
    it('favors the latest overlapping event', async () => {
      const test = pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.debounce(Duration.millis(100)),
        Fx.runCollect,
      )

      deepStrictEqual(await Effect.unsafeRunPromise(test), [3])
    })
  })
})
