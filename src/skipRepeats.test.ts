import { deepStrictEqual } from 'assert'

import { Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.skipRepeats.name, () => {
    it('skips repeating values', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3]),
            Fx.flatMap((n) => Fx.fromIterable([n, n, n])),
            Fx.skipRepeats,
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
