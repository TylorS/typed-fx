import { deepStrictEqual } from 'assert'

import { Effect, pipe } from 'effect'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.slice.name, () => {
    it('skips/takes values from a Fx', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        Fx.slice(3, 4),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [4, 5, 6, 7])
    })
  })
})
