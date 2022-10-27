import { deepEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import * as Push from './index.js'

describe(import.meta.url, () => {
  describe(Push.mapEffect.name, () => {
    it('applies an Effect to the output value of a Push', async () => {
      const value = Math.random()
      const test = pipe(
        Push.succeed(value),
        Push.mapEffect((a) => Effect.succeed(a + 1)),
        Push.runCollect,
      )

      deepEqual(await Effect.unsafeRunPromise(test), [value + 1])
    })
  })
})
