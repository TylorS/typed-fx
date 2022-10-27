import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import * as Equivalence from '@tsplus/stdlib/prelude/Equivalence'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.skipRepeats.name, () => {
    it('skips repeating values', async () => {
      const test = Effect.gen(function* ($) {
        const result = yield* $(
          pipe(
            Fx.fromIterable([1, 2, 3]),
            Fx.flatMap((n) => Fx.fromIterable([n, n, n])),
            Fx.skipRepeats(Equivalence.strict<number>()),
            Fx.runCollect,
          ),
        )

        deepStrictEqual(result, [1, 2, 3])
      })

      await Effect.unsafeRunPromise(test)
    })
  })
})
