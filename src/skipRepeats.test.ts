import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Equivalence from '@tsplus/stdlib/prelude/Equivalence'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.skipRepeats.name, () => {
    it('provides a service to the Push', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Push.fromIterable([1, 2, 3]),
            Push.flatMap((n) => Push.fromIterable([n, n, n])),
            Push.skipRepeats(Equivalence.strict<number>()),
            Push.runCollect,
            Effect.scoped,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
