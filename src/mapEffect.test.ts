import { deepEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.mapEffect.name, () => {
    it('applies an Effect to the output value of a Fx', async () => {
      const value = Math.random()
      const test = pipe(
        Fx.succeed(value),
        Fx.mapEffect((a) => Effect.succeed(a + 1)),
        Fx.runCollect,
      )

      deepEqual(await Effect.unsafeRunPromise(test), [value + 1])
    })
  })
})
