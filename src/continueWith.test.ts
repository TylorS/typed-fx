import { deepStrictEqual } from 'assert'

import { Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.continueWith.name, () => {
    it('provides a service to the Fx', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2]),
            Fx.continueWith(() => Fx.fromIterable([3, 4])),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3, 4])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
