import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.orElse.name, () => {
    it('allows recovering from failures', async () => {
      const result = await pipe(
        Push.fromIterable([1, 2, 3]),
        Push.flatMap((n) => Push.fail(n)),
        Push.orElse((n) => Push.fromIterable([n, n, n])),
        Push.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1])
    })
  })
})
