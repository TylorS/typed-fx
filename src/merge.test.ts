import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.mergeAll.name, () => {
    it('merges together emits', async () => {
      const result = await pipe(
        Fx.mergeAll([Fx.fromIterable([1, 2, 3]), Fx.fromIterable([4, 5, 6])]),
        Fx.runCollect,

        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 2, 3, 4, 5, 6])
    })
  })
})
