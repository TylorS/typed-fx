import { deepEqual } from 'assert'

import { Effect, pipe } from 'effect'

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
