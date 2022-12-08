import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.orElse.name, () => {
    it('allows recovering from failures', async () => {
      const result = await pipe(
        Fx.fromIterable([1, 2, 3]),
        Fx.flatMap((n) => Fx.fail(n)),
        Fx.orElse((n) => Fx.fromIterable([n, n, n])),
        Fx.runCollect,
        Effect.unsafeRunPromise,
      )

      deepStrictEqual(result, [1, 1, 1])
    })
  })
})
